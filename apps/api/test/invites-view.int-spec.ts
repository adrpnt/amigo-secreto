import request from 'supertest';
import { generateInviteCode } from '../src/invites/invite-code.js';
import {
  captureEvents,
  type Cookies,
  type GroupSeed,
  type GroupsApi,
  insertGroup,
  insertMembership,
  insertUser,
  openSession,
  startGroupsApi,
  stopGroupsApi,
  withSession,
} from './group-helpers.js';

const NOT_FOUND = {
  statusCode: 404,
  message: 'Convite não encontrado.',
  error: 'Not Found',
};
const TOO_MANY = {
  statusCode: 429,
  message: 'Muitas tentativas. Tente de novo em 1 minuto.',
  error: 'Too Many Requests',
};
const BROWSER =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const WHATSAPP = 'WhatsApp/2.24.22.80 A';

let api: GroupsApi;
let ipCounter = 0;

beforeAll(async () => {
  api = await startGroupsApi('invites_view', { trustProxyHops: 1 });
});

afterAll(async () => {
  await stopGroupsApi(api);
});

function newIp(): string {
  ipCounter += 1;
  return `10.5.${Math.floor(ipCounter / 256)}.${ipCounter % 256}`;
}

type OpenOptions = { cookies?: Cookies; ip?: string; userAgent?: string };

function openInvite(code: string, options: OpenOptions = {}): request.Test {
  const test = request(api.server)
    .get(`/invites/${code}`)
    .set('X-Forwarded-For', options.ip ?? newIp())
    .set('User-Agent', options.userAgent ?? BROWSER);
  return options.cookies ? withSession(test, options.cookies) : test;
}

async function inviteCodeOf(groupId: string): Promise<string> {
  const [row] = await api.dataSource.query<{ inviteCode: string }[]>(
    'SELECT "inviteCode" FROM "group" WHERE id = $1',
    [groupId],
  );
  return row.inviteCode;
}

type Scenario = {
  owner: { id: string; email: string };
  groupId: string;
  code: string;
};

// Grupo "Família" organizado por "Ana Souza".
async function invitedGroup(seed: Partial<GroupSeed> = {}): Promise<Scenario> {
  const owner = await insertUser(api.dataSource, 'Ana Souza');
  const groupId = await insertGroup(api.dataSource, {
    ownerId: owner.id,
    name: 'Família',
    ...seed,
  });
  return { owner, groupId, code: await inviteCodeOf(groupId) };
}

// Pessoa logada com a participação pedida no grupo, ou sem participação.
async function viewer(
  groupId: string,
  status?: 'PENDING' | 'APPROVED' | 'REJECTED',
): Promise<{ id: string; cookies: Cookies }> {
  const person = await insertUser(api.dataSource, 'Bia Lima');
  if (status) {
    await insertMembership(api.dataSource, groupId, person.id, status);
  }
  return {
    id: person.id,
    cookies: await openSession(api.sessions, person.id),
  };
}

// Gasta os `count` convites do minuto de um IP com códigos inexistentes.
async function exhaust(ip: string, count: number, userAgent = BROWSER) {
  for (let attempt = 1; attempt <= count; attempt++) {
    await openInvite(generateInviteCode(), { ip, userAgent });
  }
}

describe('abrir convite', () => {
  it('sem sessão devolve só nome do grupo, nome de quem organiza, status e exigência de aprovação', async () => {
    const open = await invitedGroup({
      description: 'Recado secreto',
      eventLocation: 'Casa da vó',
    });
    const withApproval = await invitedGroup({ requiresApproval: true });

    const response = await openInvite(open.code);
    const approval = await openInvite(withApproval.code);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      groupName: 'Família',
      organizerName: 'Ana Souza',
      groupStatus: 'OPEN',
      requiresApproval: false,
      viewer: 'anonymous',
      groupId: null,
    });
    expect(approval.status).toBe(200);
    expect(approval.body).toEqual({
      groupName: 'Família',
      organizerName: 'Ana Souza',
      groupStatus: 'OPEN',
      requiresApproval: true,
      viewer: 'anonymous',
      groupId: null,
    });
  });

  it('pessoa logada sem participação vê viewer none e a exigência de aprovação', async () => {
    for (const requiresApproval of [false, true]) {
      const { groupId, code } = await invitedGroup({ requiresApproval });
      const { cookies } = await viewer(groupId);

      const response = await openInvite(code, { cookies });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        groupName: 'Família',
        organizerName: 'Ana Souza',
        groupStatus: 'OPEN',
        requiresApproval,
        viewer: 'none',
        groupId: null,
      });
    }
  });

  it('participante aprovado recebe viewer member e o groupId', async () => {
    const { groupId, code } = await invitedGroup();
    const { cookies } = await viewer(groupId, 'APPROVED');

    const response = await openInvite(code, { cookies });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      groupName: 'Família',
      organizerName: 'Ana Souza',
      groupStatus: 'OPEN',
      requiresApproval: false,
      viewer: 'member',
      groupId,
    });
  });

  it('pessoa pendente recebe viewer pending', async () => {
    const { groupId, code } = await invitedGroup({ requiresApproval: true });
    const { cookies } = await viewer(groupId, 'PENDING');

    const response = await openInvite(code, { cookies });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      groupName: 'Família',
      organizerName: 'Ana Souza',
      groupStatus: 'OPEN',
      requiresApproval: true,
      viewer: 'pending',
      groupId: null,
    });
  });

  it('pessoa recusada recebe viewer rejected', async () => {
    const { groupId, code } = await invitedGroup({ requiresApproval: true });
    const { cookies } = await viewer(groupId, 'REJECTED');

    const response = await openInvite(code, { cookies });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      groupName: 'Família',
      organizerName: 'Ana Souza',
      groupStatus: 'OPEN',
      requiresApproval: true,
      viewer: 'rejected',
      groupId: null,
    });
  });

  it('devolve o status SORTEADO e ENCERRADO do grupo', async () => {
    for (const status of ['DRAWN', 'CLOSED'] as const) {
      const { code } = await invitedGroup({ status });

      const response = await openInvite(code);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        groupName: 'Família',
        organizerName: 'Ana Souza',
        groupStatus: status,
        requiresApproval: false,
        viewer: 'anonymous',
        groupId: null,
      });
    }
  });

  it('responde 404 Convite não encontrado. a código inexistente, trocado ou com formato errado, com o mesmo corpo', async () => {
    const { groupId, code: oldCode } = await invitedGroup();
    await api.dataSource.query(
      'UPDATE "group" SET "inviteCode" = $1 WHERE id = $2',
      [generateInviteCode(), groupId],
    );

    const codes = [
      generateInviteCode(),
      oldCode,
      'abc',
      `${oldCode}a`,
      'aaaaaaaaa0',
      'aaaaaaaaal',
      'aaaa-aaaaa',
    ];
    for (const code of codes) {
      const response = await openInvite(code);

      expect(response.status).toBe(404);
      expect(response.body).toEqual(NOT_FOUND);
    }
  });

  it('aceita o código em maiúsculas', async () => {
    const { code } = await invitedGroup();

    const response = await openInvite(code.toUpperCase());

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      groupName: 'Família',
      organizerName: 'Ana Souza',
    });
  });

  it('responde 429 ao 61º convite do minuto do mesmo IP e aceita o 60º', async () => {
    const { code } = await invitedGroup();
    const ip = newIp();
    const statuses: number[] = [];
    for (let attempt = 1; attempt <= 60; attempt++) {
      statuses.push((await openInvite(code, { ip })).status);
    }

    const last = await openInvite(code, { ip });

    expect(statuses).toEqual(Array.from({ length: 60 }, () => 200));
    expect(last.status).toBe(429);
    expect(last.body).toEqual(TOO_MANY);
    expect(Number(last.headers['retry-after'])).toBeGreaterThan(0);
    expect(Number(last.headers['retry-after'])).toBeLessThanOrEqual(60);
  });

  it('responde 429 ao 601º convite do minuto de um robô de preview e aceita o 600º', async () => {
    const { code } = await invitedGroup();
    const ip = newIp();
    const statuses: number[] = [];
    for (let attempt = 1; attempt <= 600; attempt++) {
      statuses.push(
        (await openInvite(code, { ip, userAgent: WHATSAPP })).status,
      );
    }

    const last = await openInvite(code, { ip, userAgent: WHATSAPP });

    expect(statuses).toEqual(Array.from({ length: 600 }, () => 200));
    expect(last.status).toBe(429);
    expect(last.body).toEqual(TOO_MANY);
  });

  it('acima do limite responde 429 a código existente e inexistente', async () => {
    const { code } = await invitedGroup();
    const ip = newIp();
    await exhaust(ip, 60);

    const existing = await openInvite(code, { ip });
    const missing = await openInvite(generateInviteCode(), { ip });
    const malformed = await openInvite('abc', { ip });

    for (const response of [existing, missing, malformed]) {
      expect(response.status).toBe(429);
      expect(response.body).toEqual(TOO_MANY);
    }
  });

  it('separa o limite pelo IP do X-Forwarded-For', async () => {
    const { code } = await invitedGroup();
    const blockedIp = newIp();
    await exhaust(blockedIp, 60);

    const fromBlocked = await openInvite(code, { ip: blockedIp });
    const fromOther = await openInvite(code, { ip: newIp() });

    expect(fromBlocked.status).toBe(429);
    expect(fromOther.status).toBe(200);
  });

  it('emite invite.viewed com o groupId e sem código, nome ou id de pessoa', async () => {
    const { owner, groupId, code } = await invitedGroup({
      name: 'Grupo Rastreável',
    });
    const person = await viewer(groupId);

    const events = await captureEvents(() =>
      openInvite(code, { cookies: person.cookies }).expect(200),
    );

    const viewed = events.filter((record) => record.event === 'invite.viewed');
    expect(viewed).toHaveLength(1);
    expect(viewed[0]).toMatchObject({ event: 'invite.viewed', groupId });
    const line = JSON.stringify(viewed[0]);
    for (const personal of [
      code,
      'Grupo Rastreável',
      'Ana Souza',
      'Bia Lima',
      owner.id,
      owner.email,
      person.id,
    ]) {
      expect(line).not.toContain(personal);
    }
  });

  it('não emite invite.viewed para robô de preview', async () => {
    const { code } = await invitedGroup();

    const events = await captureEvents(() =>
      openInvite(code, { userAgent: WHATSAPP }).expect(200),
    );

    expect(events.map((record) => record.event)).toEqual([]);
  });

  it('não emite invite.viewed para código inválido nem acima do limite', async () => {
    const { groupId, code } = await invitedGroup();
    const oldCode = code;
    await api.dataSource.query(
      'UPDATE "group" SET "inviteCode" = $1 WHERE id = $2',
      [generateInviteCode(), groupId],
    );
    const current = await inviteCodeOf(groupId);
    const ip = newIp();
    await exhaust(ip, 60);

    const invalid = await captureEvents(async () => {
      await openInvite(oldCode).expect(404);
      await openInvite('abc').expect(404);
    });
    const blocked = await captureEvents(() =>
      openInvite(current, { ip }).expect(429),
    );

    expect(invalid.map((record) => record.event)).toEqual([]);
    expect(blocked.map((record) => record.event)).toEqual([]);
  });
});
