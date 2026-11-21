// @vitest-environment node
import { createServer, type RequestListener, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { SessionResponse, SessionUser } from '@amigo-secreto/shared';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getCurrentUser, requireUser } from './session';

vi.mock('next/headers', () => ({ cookies: vi.fn() }));
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`redirect:${url}`);
  }),
}));

const USER: SessionUser = {
  id: '0b7f6c1e-3a52-4d0e-9f7a-2c1d5e8b9a10',
  name: 'Ana Souza',
  email: 'ana@example.com',
  avatarUrl: null,
  emailVerified: true,
  hasPassword: true,
  hasGoogle: false,
  marketingOptIn: false,
};

let server: Server | undefined;

async function startApi(handler: RequestListener): Promise<void> {
  server = createServer(handler);
  await new Promise<void>((resolve) => server?.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  vi.stubEnv('API_INTERNAL_URL', `http://127.0.0.1:${port}`);
}

function replyJson(status: number, body: SessionResponse | object) {
  return startApi((_request, response) => {
    response.writeHead(status, { 'content-type': 'application/json' });
    response.end(JSON.stringify(body));
  });
}

function requestCookies(header: string) {
  vi.mocked(cookies).mockResolvedValue({
    toString: () => header,
  } as Awaited<ReturnType<typeof cookies>>);
}

afterEach(async () => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  if (!server) return;
  const stopping = server;
  server = undefined;
  stopping.closeAllConnections();
  await new Promise<void>((resolve) => stopping.close(() => resolve()));
});

describe('getCurrentUser', () => {
  it('repassa o cookie da requisição a API_INTERNAL_URL/auth/session sem cache', async () => {
    const received: { path?: string; cookie?: string }[] = [];
    await startApi((request, response) => {
      received.push({ path: request.url, cookie: request.headers.cookie });
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ user: USER, googleEnabled: true }));
    });
    requestCookies('sid=token-da-sessao; csrf=abc.assinatura');
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    await expect(getCurrentUser()).resolves.toEqual(USER);

    expect(received).toEqual([
      {
        path: '/auth/session',
        cookie: 'sid=token-da-sessao; csrf=abc.assinatura',
      },
    ]);
    expect(fetchSpy.mock.calls[0][1]).toMatchObject({ cache: 'no-store' });
  });

  it('devolve null sem sessão', async () => {
    await replyJson(200, { user: null, googleEnabled: true });
    requestCookies('');

    await expect(getCurrentUser()).resolves.toBeNull();
  });

  it('lança erro quando a API responde diferente de 200', async () => {
    await replyJson(503, { statusCode: 503, message: 'Indisponível' });
    requestCookies('sid=token-da-sessao');

    await expect(getCurrentUser()).rejects.toThrow(/503/);
  });
});

describe('requireUser', () => {
  it('redireciona a /entrar com o caminho como next quando não há usuário', async () => {
    await replyJson(200, { user: null, googleEnabled: true });
    requestCookies('');

    await expect(requireUser('/grupos/abc?aba=mural')).rejects.toThrow(
      `redirect:/entrar?next=${encodeURIComponent('/grupos/abc?aba=mural')}`,
    );
    expect(redirect).toHaveBeenCalledOnce();
  });
});
