// @vitest-environment node
import { createServer, type IncomingHttpHeaders, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { InviteView } from '@amigo-secreto/shared';
import { cookies, headers } from 'next/headers';
import { getInvite } from './invites';

vi.mock('next/headers', () => ({ cookies: vi.fn(), headers: vi.fn() }));

const CODE = 'abc234defg';

const INVITE: InviteView = {
  groupName: 'Família Souza',
  organizerName: 'Ana Souza',
  groupStatus: 'OPEN',
  requiresApproval: true,
  viewer: 'none',
  groupId: null,
};

type Received = { path: string | undefined; headers: IncomingHttpHeaders };

let server: Server | undefined;
let received: Received[] = [];

async function reply(status: number, body: unknown): Promise<void> {
  received = [];
  server = createServer((request, response) => {
    received.push({ path: request.url, headers: request.headers });
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
  vi.mocked(headers).mockResolvedValue(
    new Headers({
      'x-forwarded-for': '203.0.113.7',
      'user-agent': 'WhatsApp/2.23',
    }),
  );
});

afterEach(async () => {
  vi.unstubAllEnvs();
  if (!server) return;
  const stopping = server;
  server = undefined;
  stopping.closeAllConnections();
  await new Promise<void>((resolve) => stopping.close(() => resolve()));
});

describe('getInvite', () => {
  it('repassa cookie, X-Forwarded-For e User-Agent e devolve o convite', async () => {
    await reply(200, INVITE);

    await expect(getInvite(CODE)).resolves.toEqual(INVITE);
    expect(received).toHaveLength(1);
    expect(received[0].path).toBe(`/invites/${CODE}`);
    expect(received[0].headers.cookie).toBe('sid=token-da-sessao');
    expect(received[0].headers['x-forwarded-for']).toBe('203.0.113.7');
    expect(received[0].headers['user-agent']).toBe('WhatsApp/2.23');
  });

  it('devolve null no 404', async () => {
    await reply(404, { statusCode: 404, message: 'Convite não encontrado.' });

    await expect(getInvite(CODE)).resolves.toBeNull();
  });

  it('devolve a mensagem no 429', async () => {
    await reply(429, {
      statusCode: 429,
      message: 'Muitas tentativas. Tente de novo em 1 minuto.',
    });

    await expect(getInvite(CODE)).resolves.toEqual({
      tooMany: 'Muitas tentativas. Tente de novo em 1 minuto.',
    });
  });

  it('lança em outro status', async () => {
    await reply(500, { statusCode: 500, message: 'Erro' });

    await expect(getInvite(CODE)).rejects.toThrow(/500/);
  });
});
