import { randomUUID } from 'node:crypto';
import request from 'supertest';
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

const WEB_URL = 'http://localhost:3000';
const NOT_OPEN = 'Com o sorteio feito, ninguém entra nem sai do grupo.';

type EmailJob = {
  to: string;
  subject: string;
  blocks: { type: string; text?: string; label?: string; url?: string }[];
};

type Status = 'PENDING' | 'APPROVED' | 'REJECTED';

type Person = {
  id: string;
  email: string;
  name: string;
  membershipId: string;
  cookies: Cookies;
};

type Scenario = {
  owner: Person;
  groupId: string;
  person: Person;
};

type Page = {
  items: { membershipId: string; status: string }[];
  approvedCount: number;
};

let api: GroupsApi;
let ipCounter = 0;

beforeAll(async () => {
  api = await startGroupsApi('members_remove', { trustProxyHops: 1 });
});

afterAll(async () => {
  await stopGroupsApi(api);
});

function newIp(): string {
  ipCounter += 1;
  return `10.17.${Math.floor(ipCounter / 256)}.${ipCounter % 256}`;
}

async function membershipId(groupId: string, userId: string): Promise<string> {
  const [row] = await api.dataSource.query<{ id: string }[]>(
    'SELECT id FROM membership WHERE "groupId" = $1 AND "userId" = $2',
    [groupId, userId],
  );
  return row.id;
}

async function joinAs(
  groupId: string,
  name: string,
  status: Status = 'APPROVED',
): Promise<Person> {
  const user = await insertUser(api.dataSource, name);
  await insertMembership(api.dataSource, groupId, user.id, status);
  return {
    ...user,
    name,
    membershipId: await membershipId(groupId, user.id),
    cookies: await openSession(api.sessions, user.id),
  };
}

// Grupo "Família", organizado por "Ana Souza", com a participação de
// "Bia Lima" no status pedido.
async function groupWith(
  status: Status = 'APPROVED',
  seed: Partial<GroupSeed> = {},
): Promise<Scenario> {
  const owner = await insertUser(api.dataSource, 'Ana Souza');
  const groupId = await insertGroup(api.dataSource, {
    ownerId: owner.id,
    name: 'Família',
    ...seed,
  });
  return {
    owner: {
      ...owner,
      name: 'Ana Souza',
      membershipId: await membershipId(groupId, owner.id),
      cookies: await openSession(api.sessions, owner.id),
    },
    groupId,
    person: await joinAs(groupId, 'Bia Lima', status),
  };
}

function removeMember(
  cookies: Cookies,
  groupId: string,
  id: string,
): request.Test {
  return withSession(
    request(api.server).delete(`/groups/${groupId}/members/${id}`),
    cookies,
  );
}

async function statusOf(id: string): Promise<string | undefined> {
  const [row] = await api.dataSource.query<{ status: string }[]>(
    'SELECT status FROM membership WHERE id = $1',
    [id],
  );
  return row?.status;
}

async function emailJobsTo(...emails: string[]): Promise<EmailJob[]> {
  const rows = await api.dataSource.query<{ payload: EmailJob }[]>(
    `SELECT payload FROM job
     WHERE type = 'email.send' AND payload->>'to' = ANY($1)
     ORDER BY "createdAt", id`,
    [emails],
  );
  return rows.map((row) => row.payload);
}

async function members(groupId: string, cookies: Cookies): Promise<Page> {
  const response = await withSession(
    request(api.server).get(`/groups/${groupId}/members`),
    cookies,
  );
  expect(response.status).toBe(200);
  return response.body as Page;
}

async function inviteCode(groupId: string): Promise<string> {
  const [row] = await api.dataSource.query<{ inviteCode: string }[]>(
    'SELECT "inviteCode" FROM "group" WHERE id = $1',
    [groupId],
  );
  return row.inviteCode;
}

describe('remover participante', () => {
  it('passa a participação para recusada e tira a pessoa dos aprovados', async () => {
    const { owner, groupId, person } = await groupWith();
    const other = await joinAs(groupId, 'Caio Reis');

    const response = await removeMember(
      owner.cookies,
      groupId,
      person.membershipId,
    );

    expect(response.status).toBe(204);
    expect(response.text).toBe('');
    expect(await statusOf(person.membershipId)).toBe('REJECTED');
    const ownerView = await members(groupId, owner.cookies);
    expect(ownerView.approvedCount).toBe(2);
    expect(ownerView.items).toContainEqual(
      expect.objectContaining({
        membershipId: person.membershipId,
        status: 'REJECTED',
      }),
    );
    const otherView = await members(groupId, other.cookies);
    expect(otherView.items.map((item) => item.membershipId)).not.toContain(
      person.membershipId,
    );
  });

  it('a pessoa removida abre o convite como recusada e não entra de novo', async () => {
    const { owner, groupId, person } = await groupWith();
    await removeMember(owner.cookies, groupId, person.membershipId).expect(204);
    const code = await inviteCode(groupId);

    const view = await withSession(
      request(api.server)
        .get(`/invites/${code}`)
        .set('X-Forwarded-For', newIp()),
      person.cookies,
    );
    const join = await withSession(
      request(api.server)
        .post(`/invites/${code}/join`)
        .set('X-Forwarded-For', newIp()),
      person.cookies,
    );

    expect(view.status).toBe(200);
    expect(view.body).toMatchObject({ viewer: 'rejected', groupId: null });
    expect(join.status).toBe(200);
    expect(join.body).toEqual({ status: 'REJECTED', groupId: null });
    expect(await statusOf(person.membershipId)).toBe('REJECTED');
    const rows = await api.dataSource.query<unknown[]>(
      'SELECT id FROM membership WHERE "groupId" = $1 AND "userId" = $2',
      [groupId, person.id],
    );
    expect(rows).toHaveLength(1);
  });

  it('responde 409 com o grupo SORTEADO ou ENCERRADO sem remover', async () => {
    for (const status of ['DRAWN', 'CLOSED'] as const) {
      const { owner, groupId, person } = await groupWith('APPROVED', {
        status,
      });

      for (const id of [person.membershipId, owner.membershipId]) {
        const response = await removeMember(owner.cookies, groupId, id);

        expect(response.status).toBe(409);
        expect(response.body).toEqual({
          statusCode: 409,
          message: NOT_OPEN,
          error: 'Conflict',
        });
        expect(await statusOf(id)).toBe('APPROVED');
      }
    }
  });

  it('responde 409 Quem organiza não pode ser removido.', async () => {
    const { owner, groupId } = await groupWith();

    const response = await removeMember(
      owner.cookies,
      groupId,
      owner.membershipId,
    );

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      statusCode: 409,
      message: 'Quem organiza não pode ser removido.',
      error: 'Conflict',
    });
    expect(await statusOf(owner.membershipId)).toBe('APPROVED');
  });

  it('responde 403 a participante que não organiza sem remover', async () => {
    const { groupId, person } = await groupWith();
    const other = await joinAs(groupId, 'Caio Reis');

    const response = await removeMember(
      other.cookies,
      groupId,
      person.membershipId,
    );

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      statusCode: 403,
      message: 'Só quem organiza pode alterar o grupo.',
      error: 'Forbidden',
    });
    expect(await statusOf(person.membershipId)).toBe('APPROVED');
  });

  it('responde 404 a participação que não está aprovada', async () => {
    const { owner, groupId } = await groupWith();
    const pending = await joinAs(groupId, 'Caio Reis', 'PENDING');
    const rejected = await joinAs(groupId, 'Duda Melo', 'REJECTED');
    const other = await groupWith();

    for (const id of [
      pending.membershipId,
      rejected.membershipId,
      other.person.membershipId,
      randomUUID(),
      'não-é-uuid',
    ]) {
      const response = await removeMember(owner.cookies, groupId, id);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        statusCode: 404,
        message: 'Participante não encontrado.',
        error: 'Not Found',
      });
    }
    expect(await statusOf(pending.membershipId)).toBe('PENDING');
    expect(await statusOf(rejected.membershipId)).toBe('REJECTED');
    expect(await statusOf(other.person.membershipId)).toBe('APPROVED');
  });

  it('enfileira o aviso de remoção à pessoa', async () => {
    const { owner, groupId, person } = await groupWith();

    await removeMember(owner.cookies, groupId, person.membershipId).expect(204);

    expect(await emailJobsTo(person.email)).toEqual([
      {
        to: person.email,
        subject: 'Ana Souza removeu você de Família',
        blocks: [
          { type: 'paragraph', text: 'Olá, Bia Lima.' },
          {
            type: 'paragraph',
            text: 'Ana Souza removeu você do grupo Família no Amigo Secreto.',
          },
          {
            type: 'button',
            label: 'Ver meus grupos',
            url: `${WEB_URL}/grupos`,
          },
        ],
      },
    ]);
    expect(await emailJobsTo(owner.email)).toEqual([]);
  });

  it('emite membership.removed sem dados pessoais', async () => {
    const { owner, groupId, person } = await groupWith('APPROVED', {
      name: 'Grupo Rastreável',
    });
    const code = await inviteCode(groupId);

    const events = await captureEvents(() =>
      removeMember(owner.cookies, groupId, person.membershipId).expect(204),
    );

    const removed = events.filter((record) =>
      String(record.event).startsWith('membership.'),
    );
    expect(removed).toEqual([
      expect.objectContaining({ event: 'membership.removed', groupId }),
    ]);
    const line = JSON.stringify(removed[0]);
    for (const personal of [
      'Grupo Rastreável',
      'Ana Souza',
      'Bia Lima',
      code,
      owner.id,
      owner.email,
      person.id,
      person.email,
      person.membershipId,
    ]) {
      expect(line).not.toContain(personal);
    }
  });

  it('não emite evento nem aviso quando a remoção é recusada', async () => {
    const drawn = await groupWith('APPROVED', { status: 'DRAWN' });
    const forbidden = await groupWith();
    const other = await joinAs(forbidden.groupId, 'Caio Reis');
    const pending = await groupWith('PENDING');
    const organizer = await groupWith();

    // Se o aviso não grava, a remoção é desfeita e nenhum evento sai.
    const failing = await groupWith('APPROVED', { name: 'Aviso Falha' });
    await api.dataSource.query(`
      CREATE FUNCTION fail_remove_notice() RETURNS trigger AS $$
      BEGIN
        IF NEW.payload->>'subject' LIKE '%Aviso Falha%' THEN
          RAISE EXCEPTION 'falha forçada no aviso';
        END IF;
        RETURN NEW;
      END $$ LANGUAGE plpgsql`);
    await api.dataSource.query(`
      CREATE TRIGGER fail_remove_notice BEFORE INSERT ON job
      FOR EACH ROW EXECUTE FUNCTION fail_remove_notice()`);

    let events: Record<string, unknown>[];
    try {
      events = await captureEvents(async () => {
        await removeMember(
          drawn.owner.cookies,
          drawn.groupId,
          drawn.person.membershipId,
        ).expect(409);
        await removeMember(
          other.cookies,
          forbidden.groupId,
          forbidden.person.membershipId,
        ).expect(403);
        await removeMember(
          pending.owner.cookies,
          pending.groupId,
          pending.person.membershipId,
        ).expect(404);
        await removeMember(
          organizer.owner.cookies,
          organizer.groupId,
          organizer.owner.membershipId,
        ).expect(409);
        await removeMember(
          failing.owner.cookies,
          failing.groupId,
          failing.person.membershipId,
        ).expect(500);
      });
    } finally {
      await api.dataSource.query('DROP TRIGGER fail_remove_notice ON job');
      await api.dataSource.query('DROP FUNCTION fail_remove_notice()');
    }

    expect(await statusOf(drawn.person.membershipId)).toBe('APPROVED');
    expect(await statusOf(forbidden.person.membershipId)).toBe('APPROVED');
    expect(await statusOf(pending.person.membershipId)).toBe('PENDING');
    expect(await statusOf(organizer.owner.membershipId)).toBe('APPROVED');
    expect(await statusOf(failing.person.membershipId)).toBe('APPROVED');
    expect(
      await emailJobsTo(
        ...[drawn, forbidden, pending, organizer, failing].flatMap(
          (scenario) => [scenario.person.email, scenario.owner.email],
        ),
      ),
    ).toEqual([]);
    expect(
      events.filter((record) => String(record.event).startsWith('membership.')),
    ).toEqual([]);
  });
});
