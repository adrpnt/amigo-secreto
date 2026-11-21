// @vitest-environment node
import { createServer, type RequestListener, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { cookies } from 'next/headers';
import { apiServerFetch } from './api-server';

vi.mock('next/headers', () => ({ cookies: vi.fn() }));

let server: Server | undefined;

async function startApi(handler: RequestListener): Promise<void> {
  server = createServer(handler);
  await new Promise<void>((resolve) => server?.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  vi.stubEnv('API_INTERNAL_URL', `http://127.0.0.1:${port}`);
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

describe('apiServerFetch', () => {
  it('repassa o cookie da requisição à URL interna da API', async () => {
    const received: { path?: string; cookie?: string }[] = [];
    await startApi((request, response) => {
      received.push({ path: request.url, cookie: request.headers.cookie });
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ ok: true }));
    });
    requestCookies('sid=token-da-sessao; csrf=abc.assinatura');
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const response = await apiServerFetch('/groups/mine');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(received).toEqual([
      {
        path: '/groups/mine',
        cookie: 'sid=token-da-sessao; csrf=abc.assinatura',
      },
    ]);
    expect(fetchSpy.mock.calls[0][1]).toMatchObject({ cache: 'no-store' });
  });

  it('lança erro sem API_INTERNAL_URL', async () => {
    vi.stubEnv('API_INTERNAL_URL', '');
    requestCookies('sid=token-da-sessao');
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    await expect(apiServerFetch('/groups/mine')).rejects.toThrow(
      'API_INTERNAL_URL não está definida.',
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
