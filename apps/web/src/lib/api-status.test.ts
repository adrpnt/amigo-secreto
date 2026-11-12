// @vitest-environment node
import { createServer, type RequestListener, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { getApiStatus } from './api-status';

let server: Server | undefined;

async function startApi(handler: RequestListener): Promise<string> {
  server = createServer(handler);
  await new Promise<void>((resolve) => server?.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return `http://127.0.0.1:${port}`;
}

async function closedPortUrl(): Promise<string> {
  const url = await startApi(() => undefined);
  await stopApi();
  return url;
}

async function stopApi(): Promise<void> {
  if (!server) return;
  const stopping = server;
  server = undefined;
  stopping.closeAllConnections();
  await new Promise<void>((resolve) => stopping.close(() => resolve()));
}

afterEach(async () => {
  await stopApi();
  vi.unstubAllEnvs();
});

describe('getApiStatus', () => {
  it('devolve online quando a API responde 200', async () => {
    const paths: string[] = [];
    const url = await startApi((request, response) => {
      paths.push(request.url ?? '');
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(
        JSON.stringify({
          status: 'ok',
          details: { database: { status: 'up' } },
        }),
      );
    });
    vi.stubEnv('API_INTERNAL_URL', url);

    await expect(getApiStatus()).resolves.toBe('online');
    expect(paths).toEqual(['/health']);
  });

  it('devolve unavailable quando a API responde 503', async () => {
    const url = await startApi((_request, response) => {
      response.writeHead(503, { 'content-type': 'application/json' });
      response.end(
        JSON.stringify({
          status: 'error',
          details: { database: { status: 'down' } },
        }),
      );
    });
    vi.stubEnv('API_INTERNAL_URL', url);

    await expect(getApiStatus()).resolves.toBe('unavailable');
  });

  it('devolve unavailable quando a API não responde', async () => {
    vi.stubEnv('API_INTERNAL_URL', await closedPortUrl());

    await expect(getApiStatus()).resolves.toBe('unavailable');
  });

  it('devolve unavailable quando a API passa de 5 segundos', async () => {
    const url = await startApi(() => undefined);
    vi.stubEnv('API_INTERNAL_URL', url);
    const startedAt = performance.now();

    await expect(getApiStatus()).resolves.toBe('unavailable');

    const elapsed = performance.now() - startedAt;
    expect(elapsed).toBeGreaterThanOrEqual(4_900);
    expect(elapsed).toBeLessThan(6_000);
  }, 10_000);

  it('devolve unavailable quando a API responde 200 sem status ok', async () => {
    const responses = [
      {
        contentType: 'text/html',
        body: '<html><body>Página de manutenção</body></html>',
      },
      { contentType: 'application/json', body: '{"status":"error"}' },
      { contentType: 'application/json', body: '{}' },
    ];
    let served = 0;
    const url = await startApi((_request, response) => {
      const { contentType, body } = responses[served];
      served += 1;
      response.writeHead(200, { 'content-type': contentType });
      response.end(body);
    });
    vi.stubEnv('API_INTERNAL_URL', url);

    const statuses = [
      await getApiStatus(),
      await getApiStatus(),
      await getApiStatus(),
    ];

    expect(statuses).toEqual(['unavailable', 'unavailable', 'unavailable']);
    expect(served).toBe(responses.length);
  });

  it('lança erro que nomeia API_INTERNAL_URL quando ela falta', async () => {
    vi.stubEnv('API_INTERNAL_URL', undefined);

    await expect(getApiStatus()).rejects.toThrow(/API_INTERNAL_URL/);
  });
});
