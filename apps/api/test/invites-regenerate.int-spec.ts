import request from 'supertest';
import { INVITE_CODE_ALPHABET } from '../src/invites/invite-code.js';
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

const NOT_OPEN = {
  statusCode: 409,
  message: 'Com o sorteio feito, ninguém entra nem sai do grupo.',
  error: 'Conflict',
};
const ORGANIZER_ONLY = {
  statusCode: 403,
  message: 'Só quem organiza pode alterar o grupo.',
  error: 'Forbidden',
};
const GROUP_NOT_FOUND = {
  statusCode: 404,
  message: 'Grupo não encontrado.',
  error: 'Not Found',
};
const CODE_PATTERN = new RegExp(`^[${INVITE_CODE_ALPHABET}]{10}$`);

let api: GroupsApi;
let ipCounter = 0;

beforeAll(async () => {
  api = await startGroupsApi('invites_regenerate', { trustProxyHops: 1 });
});

afterAll(async () => {
  await stopGroupsApi(api);
});

function newIp(): string {
  ipCounter += 1;
  return `10.7.${Math.floor(ipCounter / 256)}.${ipCounter % 256}`;
}

function regenerate(cookies: Cookies, groupId: string): request.Test {
  return withSession(
    request(api.server).post(`/groups/${groupId}/invite/regenerate`),
    cookies,
  );
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
  cookies: Cookies;
};

// Grupo "Família" organizado por "Ana Souza", com a sessão dela.
async function organizedGroup(
  seed: Partial<GroupSeed> = {},
): Promise<Scenario> {
  const owner = await insertUser(api.dataSource, 'Ana Souza');
  const groupId = await insertGroup(api.dataSource, {
    ownerId: owner.id,
    name: 'Família',
    ...seed,
  });
  return {
    owner,
    groupId,
    code: await inviteCodeOf(groupId),
    cookies: await openSession(api.sessions, owner.id),
  };
}

async function personWith(
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

describe('gerar novo link', () => {
  it('troca o código do grupo e devolve o novo', async () => {
    const { groupId, code, cookies } = await organizedGroup();

    const response = await regenerate(cookies, groupId);

    expect(response.status).toBe(200);
    const saved = await inviteCodeOf(groupId);
    expect(response.body).toEqual({ inviteCode: saved });
    expect(saved).not.toBe(code);
    expect(saved).toMatch(CODE_PATTERN);
  });

  it('o código antigo passa a responder 404 ao abrir e ao entrar', async () => {
    const { groupId, code, cookies } = await organizedGroup();
    const guest = await personWith(groupId);
    await regenerate(cookies, groupId).expect(200);
    const fresh = await inviteCodeOf(groupId);

    const opened = await request(api.server)
      .get(`/invites/${code}`)
      .set('X-Forwarded-For', newIp());
    const joined = await withSession(
      request(api.server)
        .post(`/invites/${code}/join`)
        .set('X-Forwarded-For', newIp()),
      guest.cookies,
    );
    const openedFresh = await request(api.server)
      .get(`/invites/${fresh}`)
      .set('X-Forwarded-For', newIp());

    for (const response of [opened, joined]) {
      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        statusCode: 404,
        message: 'Convite não encontrado.',
        error: 'Not Found',
      });
    }
    expect(
      await api.dataSource.query(
        'SELECT id FROM membership WHERE "groupId" = $1 AND "userId" = $2',
        [groupId, guest.id],
      ),
    ).toEqual([]);
    expect(openedFresh.status).toBe(200);
    expect(openedFresh.body).toMatchObject({ groupName: 'Família' });
  });

  it('mantém todas as participações do grupo', async () => {
    const { groupId, cookies } = await organizedGroup();
    for (const status of ['APPROVED', 'PENDING', 'REJECTED'] as const) {
      await personWith(groupId, status);
    }
    const membershipsOf = () =>
      api.dataSource.query<unknown[]>(
        `SELECT id, "userId", status, "joinedAt" FROM membership
         WHERE "groupId" = $1 ORDER BY id`,
        [groupId],
      );
    const before = await membershipsOf();

    await regenerate(cookies, groupId).expect(200);

    expect(before).toHaveLength(4);
    expect(await membershipsOf()).toEqual(before);
  });

  it('responde 409 com o grupo SORTEADO ou ENCERRADO e mantém o código', async () => {
    for (const status of ['DRAWN', 'CLOSED'] as const) {
      const { groupId, code, cookies } = await organizedGroup({ status });

      const response = await regenerate(cookies, groupId);

      expect(response.status).toBe(409);
      expect(response.body).toEqual(NOT_OPEN);
      expect(await inviteCodeOf(groupId)).toBe(code);
    }
  });

  it('responde 403 a participante que não organiza e mantém o código', async () => {
    const { groupId, code } = await organizedGroup();
    const member = await personWith(groupId, 'APPROVED');

    const response = await regenerate(member.cookies, groupId);

    expect(response.status).toBe(403);
    expect(response.body).toEqual(ORGANIZER_ONLY);
    expect(await inviteCodeOf(groupId)).toBe(code);
  });

  it('responde 404 a quem não participa', async () => {
    const { groupId, code } = await organizedGroup();
    const outsider = await personWith(groupId);
    const pending = await personWith(groupId, 'PENDING');

    for (const cookies of [outsider.cookies, pending.cookies]) {
      const response = await regenerate(cookies, groupId);

      expect(response.status).toBe(404);
      expect(response.body).toEqual(GROUP_NOT_FOUND);
      expect(await inviteCodeOf(groupId)).toBe(code);
    }
    const missing = await regenerate(outsider.cookies, 'nao-e-uuid');
    expect(missing.status).toBe(404);
    expect(missing.body).toEqual(GROUP_NOT_FOUND);
  });

  it('responde 429 à 11ª troca da hora do grupo e aceita a 10ª', async () => {
    const { groupId, cookies } = await organizedGroup();
    const statuses: number[] = [];
    for (let attempt = 1; attempt <= 10; attempt++) {
      statuses.push((await regenerate(cookies, groupId)).status);
    }
    const tenth = await inviteCodeOf(groupId);

    const last = await regenerate(cookies, groupId);

    expect(statuses).toEqual(Array.from({ length: 10 }, () => 200));
    expect(last.status).toBe(429);
    expect(last.body).toEqual({
      statusCode: 429,
      message: 'Muitas tentativas. Tente de novo em 60 minutos.',
      error: 'Too Many Requests',
    });
    expect(Number(last.headers['retry-after'])).toBeGreaterThan(3500);
    expect(await inviteCodeOf(groupId)).toBe(tenth);
  });

  it('emite invite.regenerated sem o código', async () => {
    const { owner, groupId, code, cookies } = await organizedGroup({
      name: 'Grupo Rastreável',
    });

    const events = await captureEvents(() =>
      regenerate(cookies, groupId).expect(200),
    );

    const fresh = await inviteCodeOf(groupId);
    const regenerated = events.filter(
      (record) => record.event === 'invite.regenerated',
    );
    expect(regenerated).toHaveLength(1);
    expect(regenerated[0]).toMatchObject({
      event: 'invite.regenerated',
      groupId,
    });
    const line = JSON.stringify(regenerated[0]);
    for (const personal of [
      code,
      fresh,
      'Grupo Rastreável',
      'Ana Souza',
      owner.id,
      owner.email,
    ]) {
      expect(line).not.toContain(personal);
    }
  });

  it('não emite invite.regenerated quando a troca é recusada', async () => {
    const drawn = await organizedGroup({ status: 'DRAWN' });
    const open = await organizedGroup();
    const member = await personWith(open.groupId, 'APPROVED');
    const outsider = await personWith(open.groupId);
    for (let attempt = 1; attempt <= 10; attempt++) {
      await regenerate(open.cookies, open.groupId).expect(200);
    }

    const events = await captureEvents(async () => {
      await regenerate(drawn.cookies, drawn.groupId).expect(409);
      await regenerate(member.cookies, open.groupId).expect(403);
      await regenerate(outsider.cookies, open.groupId).expect(404);
      await regenerate(open.cookies, open.groupId).expect(429);
    });

    expect(events.map((record) => record.event)).toEqual([]);
  });
});
