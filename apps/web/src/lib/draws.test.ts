// @vitest-environment node
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { DrawPanel, ExclusionsResponse } from '@amigo-secreto/shared';
import { cookies } from 'next/headers';
import { getDrawPanel, getExclusions } from './draws';

vi.mock('next/headers', () => ({ cookies: vi.fn() }));

const GROUP_ID = '6f1d2c3b-4a5e-4f60-8b7a-9c0d1e2f3a4b';

const ANA = {
  membershipId: '1a2b3c4d-5e6f-4a70-8b9c-0d1e2f3a4b5c',
  name: 'Ana Souza',
};
const BRUNO = {
  membershipId: '2b3c4d5e-6f70-4a81-9c0d-1e2f3a4b5c6d',
  name: 'Bruno Lima',
};
const CARLA = {
  membershipId: '3c4d5e6f-7081-4b92-8d1e-2f3a4b5c6d7e',
  name: 'Carla Dias',
};
const PAIR = { id: '4d5e6f70-8192-4ca3-9e2f-3a4b5c6d7e8f', a: ANA, b: BRUNO };

const PANEL: DrawPanel = {
  status: 'OPEN',
  drawnAt: null,
  approved: 3,
  pending: 1,
  feasible: false,
  pairsToReview: [PAIR],
};

const EXCLUSIONS: ExclusionsResponse = {
  participants: [ANA, BRUNO, CARLA],
  pairs: [PAIR],
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

describe('getDrawPanel', () => {
  it('devolve o painel', async () => {
    await reply(200, PANEL);

    await expect(getDrawPanel(GROUP_ID)).resolves.toEqual(PANEL);
    expect(received).toEqual([
      { path: `/groups/${GROUP_ID}/draw`, cookie: 'sid=token-da-sessao' },
    ]);
  });

  it('devolve null no 404', async () => {
    await reply(404, { statusCode: 404, message: 'Grupo não encontrado.' });

    await expect(getDrawPanel(GROUP_ID)).resolves.toBeNull();
  });

  it('lança em outro status', async () => {
    await reply(403, { statusCode: 403, message: 'Proibido' });

    await expect(getDrawPanel(GROUP_ID)).rejects.toThrow(/403/);
  });
});

describe('getExclusions', () => {
  it('devolve participantes e pares', async () => {
    await reply(200, EXCLUSIONS);

    await expect(getExclusions(GROUP_ID)).resolves.toEqual(EXCLUSIONS);
    expect(received).toEqual([
      { path: `/groups/${GROUP_ID}/exclusions`, cookie: 'sid=token-da-sessao' },
    ]);
  });

  it('devolve null no 404', async () => {
    await reply(404, { statusCode: 404, message: 'Grupo não encontrado.' });

    await expect(getExclusions(GROUP_ID)).resolves.toBeNull();
  });
});
