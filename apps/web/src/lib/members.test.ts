// @vitest-environment node
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { MembersPage } from '@amigo-secreto/shared';
import { cookies } from 'next/headers';
import { getMembers } from './members';

vi.mock('next/headers', () => ({ cookies: vi.fn() }));

const GROUP_ID = '6f1d2c3b-4a5e-4f60-8b7a-9c0d1e2f3a4b';

const PAGE: MembersPage = {
  items: [
    {
      membershipId: '1a2b3c4d-5e6f-4a70-8b9c-0d1e2f3a4b5c',
      name: 'Ana Souza',
      avatarUrl: null,
      status: 'APPROVED',
      isOrganizer: true,
    },
  ],
  nextCursor: null,
  approvedCount: 1,
};

let server: Server | undefined;
let received: { path: string | undefined; cookie: string | undefined }[] = [];

async function reply(status: number, body: unknown): Promise<void> {
  received = [];
  server = createServer((request, response) => {
    received.push({ path: request.url, cookie: request.headers.cookie });
    response.writeHead(status, { 'content-type': 'application/json' });
    response.end(JSON.stringify(body));
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

describe('getMembers', () => {
  it('devolve a primeira página da lista', async () => {
    await reply(200, PAGE);

    await expect(getMembers(GROUP_ID)).resolves.toEqual(PAGE);
    expect(received).toEqual([
      { path: `/groups/${GROUP_ID}/members`, cookie: 'sid=token-da-sessao' },
    ]);
  });

  it('devolve null no 404', async () => {
    await reply(404, { statusCode: 404, message: 'Grupo não encontrado.' });

    await expect(getMembers(GROUP_ID)).resolves.toBeNull();
  });

  it('lança em outro status', async () => {
    await reply(500, { statusCode: 500, message: 'Erro' });

    await expect(getMembers(GROUP_ID)).rejects.toThrow(/500/);
  });
});
