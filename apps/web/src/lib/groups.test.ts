// @vitest-environment node
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { cookies } from 'next/headers';
import { getGroup, getMyGroups } from './groups';

vi.mock('next/headers', () => ({ cookies: vi.fn() }));

const GROUP_ID = '6f1d2c3b-4a5e-4f60-8b7a-9c0d1e2f3a4b';

let server: Server | undefined;
let receivedPaths: (string | undefined)[] = [];

async function replyStatus(status: number): Promise<void> {
  receivedPaths = [];
  server = createServer((request, response) => {
    receivedPaths.push(request.url);
    response.writeHead(status, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ statusCode: status, message: 'Erro' }));
  });
  await new Promise<void>((resolve) => server?.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  vi.stubEnv('API_INTERNAL_URL', `http://127.0.0.1:${port}`);
}

beforeEach(() => {
  vi.mocked(cookies).mockResolvedValue({
    toString: () => 'sid=token-da-sessao',
  } as Awaited<ReturnType<typeof cookies>>);
});

afterEach(async () => {
  vi.unstubAllEnvs();
  if (!server) return;
  const stopping = server;
  server = undefined;
  stopping.closeAllConnections();
  await new Promise<void>((resolve) => stopping.close(() => resolve()));
});

describe('getGroup', () => {
  it('devolve null quando a API responde 404', async () => {
    await replyStatus(404);

    await expect(getGroup(GROUP_ID)).resolves.toBeNull();
    expect(receivedPaths).toEqual([`/groups/${GROUP_ID}`]);
  });

  it('lança erro quando a API responde 500', async () => {
    await replyStatus(500);

    await expect(getGroup(GROUP_ID)).rejects.toThrow(/500/);
  });
});

describe('getMyGroups', () => {
  it('lança erro quando a API não responde 200', async () => {
    await replyStatus(503);

    await expect(getMyGroups()).rejects.toThrow(/503/);
    expect(receivedPaths).toEqual(['/groups']);
  });
});
