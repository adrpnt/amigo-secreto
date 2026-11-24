// @vitest-environment node
import { createServer, type RequestListener, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { cookies, headers } from 'next/headers';
import { apiServerFetch } from './api-server';

vi.mock('next/headers', () => ({ cookies: vi.fn(), headers: vi.fn() }));

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

function requestHeaders(values: Record<string, string>) {
  vi.mocked(headers).mockResolvedValue(new Headers(values));
}

type ClientHeaders = {
  forwardedFor?: string | string[];
  userAgent?: string;
};

async function startApiRecordingClient(): Promise<ClientHeaders[]> {
  const received: ClientHeaders[] = [];
  await startApi((request, response) => {
    received.push({
      forwardedFor: request.headers['x-forwarded-for'],
      userAgent: request.headers['user-agent'],
    });
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ ok: true }));
  });
  return received;
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

  it('repassa X-Forwarded-For e User-Agent quando pedido', async () => {
    const received = await startApiRecordingClient();
    requestCookies('sid=token-da-sessao');
    requestHeaders({
      'x-forwarded-for': '203.0.113.7',
      'user-agent': 'Mozilla/5.0 (iPhone) WhatsApp/2.24',
    });

    const response = await apiServerFetch('/invites/abc123', {
      forwardClient: true,
    });

    expect(response.status).toBe(200);
    expect(received).toEqual([
      {
        forwardedFor: '203.0.113.7',
        userAgent: 'Mozilla/5.0 (iPhone) WhatsApp/2.24',
      },
    ]);
  });

  it('não repassa os cabeçalhos do cliente por padrão', async () => {
    const received = await startApiRecordingClient();
    requestCookies('sid=token-da-sessao');
    requestHeaders({
      'x-forwarded-for': '203.0.113.7',
      'user-agent': 'Mozilla/5.0 (iPhone) WhatsApp/2.24',
    });

    const response = await apiServerFetch('/groups/mine');

    expect(response.status).toBe(200);
    expect(received).toHaveLength(1);
    expect(received[0].forwardedFor).toBeUndefined();
    expect(received[0].userAgent).not.toBe(
      'Mozilla/5.0 (iPhone) WhatsApp/2.24',
    );
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
