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

type Scenario = { owner: Person; groupId: string; person: Person };

let api: GroupsApi;

beforeAll(async () => {
  api = await startGroupsApi('members_transfer');
});

afterAll(async () => {
  await stopGroupsApi(api);
});

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

// Grupo "Família", organizado por "Ana Souza", com "Bia Lima" aprovada.
async function groupWith(seed: Partial<GroupSeed> = {}): Promise<Scenario> {
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
    person: await joinAs(groupId, 'Bia Lima'),
  };
}

function transfer(
  cookies: Cookies,
  groupId: string,
  membershipId: string,
): request.Test {
  return withSession(
    request(api.server).post(`/groups/${groupId}/transfer`),
    cookies,
  ).send({ membershipId });
}

async function ownerOf(groupId: string): Promise<string> {
  const [row] = await api.dataSource.query<{ ownerId: string }[]>(
    'SELECT "ownerId" FROM "group" WHERE id = $1',
    [groupId],
  );
  return row.ownerId;
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

async function waitForLockWaiters(count: number): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt++) {
    const [{ waiting }] = await api.dataSource.query<{ waiting: number }[]>(
      `SELECT count(*)::int AS waiting FROM pg_stat_activity
       WHERE datname = current_database() AND wait_event_type = 'Lock'`,
    );
    if (waiting >= count) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error('Os pedidos não chegaram a esperar a trava.');
}

// Trava o grupo, dispara os pedidos na ordem dada, cada um só depois de o
// anterior esperar a trava, e solta: o Postgres atende na ordem de chegada.
async function inLockOrder(
  groupId: string,
  requests: (() => request.Test)[],
): Promise<request.Response[]> {
  const holder = api.dataSource.createQueryRunner();
  await holder.connect();
  try {
    await holder.startTransaction();
    await holder.query('SELECT id FROM "group" WHERE id = $1 FOR UPDATE', [
      groupId,
    ]);
    const pending: Promise<request.Response>[] = [];
    for (const [index, send] of requests.entries()) {
      pending.push(send().then((response) => response));
      await waitForLockWaiters(index + 1);
    }
    await holder.commitTransaction();
    return await Promise.all(pending);
  } finally {
    await holder.release();
  }
}

describe('transferir organização', () => {
  it('faz da pessoa escolhida quem organiza e mantém a antiga como participante aprovada', async () => {
    const { owner, groupId, person } = await groupWith();

    const response = await transfer(
      owner.cookies,
      groupId,
      person.membershipId,
    );

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: groupId,
      owner: { id: person.id, name: 'Bia Lima' },
      isOrganizer: false,
    });
    expect(await ownerOf(groupId)).toBe(person.id);
    expect(await statusOf(owner.membershipId)).toBe('APPROVED');
    expect(await statusOf(person.membershipId)).toBe('APPROVED');
    const newView = await withSession(
      request(api.server).get(`/groups/${groupId}`),
      person.cookies,
    );
    const oldView = await withSession(
      request(api.server).get(`/groups/${groupId}`),
      owner.cookies,
    );
    expect(newView.body).toMatchObject({
      owner: { id: person.id, name: 'Bia Lima' },
      isOrganizer: true,
    });
    expect(oldView.status).toBe(200);
    expect(oldView.body).toMatchObject({ isOrganizer: false });
  });

  it('transfere com o grupo SORTEADO', async () => {
    const { owner, groupId, person } = await groupWith({ status: 'DRAWN' });

    const response = await transfer(
      owner.cookies,
      groupId,
      person.membershipId,
    );

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: 'DRAWN',
      owner: { id: person.id, name: 'Bia Lima' },
      isOrganizer: false,
    });
    expect(await ownerOf(groupId)).toBe(person.id);
  });

  it('responde 409 Grupo encerrado não pode ser alterado. com o grupo ENCERRADO', async () => {
    const { owner, groupId, person } = await groupWith({ status: 'CLOSED' });

    const response = await transfer(
      owner.cookies,
      groupId,
      person.membershipId,
    );

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      statusCode: 409,
      message: 'Grupo encerrado não pode ser alterado.',
      error: 'Conflict',
    });
    expect(await ownerOf(groupId)).toBe(owner.id);
  });

  it('responde 404 Participante não encontrado. a pendente, recusado, de outro grupo ou a quem já organiza', async () => {
    const { owner, groupId } = await groupWith();
    const pending = await joinAs(groupId, 'Caio Reis', 'PENDING');
    const rejected = await joinAs(groupId, 'Duda Melo', 'REJECTED');
    const other = await groupWith();

    for (const id of [
      pending.membershipId,
      rejected.membershipId,
      other.person.membershipId,
      owner.membershipId,
      randomUUID(),
      'não-é-uuid',
    ]) {
      const response = await transfer(owner.cookies, groupId, id);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        statusCode: 404,
        message: 'Participante não encontrado.',
        error: 'Not Found',
      });
    }
    expect(await ownerOf(groupId)).toBe(owner.id);
    expect(await ownerOf(other.groupId)).toBe(other.owner.id);
  });

  it('responde 403 a quem não organiza', async () => {
    const { owner, groupId, person } = await groupWith();
    const other = await joinAs(groupId, 'Caio Reis');

    const response = await transfer(
      person.cookies,
      groupId,
      other.membershipId,
    );

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      statusCode: 403,
      message: 'Só quem organiza pode alterar o grupo.',
      error: 'Forbidden',
    });
    expect(await ownerOf(groupId)).toBe(owner.id);
  });

  it('depois da transferência o antigo organizador recebe 403 ao editar', async () => {
    const { owner, groupId, person } = await groupWith({
      requiresApproval: true,
    });
    const pending = await joinAs(groupId, 'Caio Reis', 'PENDING');
    await transfer(owner.cookies, groupId, person.membershipId).expect(200);
    const edit = (cookies: Cookies) =>
      withSession(request(api.server).put(`/groups/${groupId}`), cookies).send({
        name: 'Família Silva',
        requiresApproval: true,
      });

    const oldEdit = await edit(owner.cookies);
    const newEdit = await edit(person.cookies);

    expect(oldEdit.status).toBe(403);
    expect(oldEdit.body).toEqual({
      statusCode: 403,
      message: 'Só quem organiza pode alterar o grupo.',
      error: 'Forbidden',
    });
    expect(newEdit.status).toBe(200);
    expect(newEdit.body).toMatchObject({
      name: 'Família Silva',
      isOrganizer: true,
    });
    const members = await withSession(
      request(api.server).get(`/groups/${groupId}/members`),
      person.cookies,
    );
    expect(members.body).toMatchObject({
      items: expect.arrayContaining([
        expect.objectContaining({
          membershipId: pending.membershipId,
          status: 'PENDING',
        }),
      ]) as unknown,
    });
  });

  it('a resposta da transferência não traz dado de sorteio', async () => {
    const { owner, groupId, person } = await groupWith({ status: 'DRAWN' });

    const response = await transfer(
      owner.cookies,
      groupId,
      person.membershipId,
    );

    expect(response.status).toBe(200);
    expect(Object.keys(response.body as object).sort()).toEqual([
      'closedAt',
      'createdAt',
      'description',
      'drawScheduledAt',
      'eventAt',
      'eventLocation',
      'giftMaxValue',
      'giftMinValue',
      'id',
      'inviteCode',
      'isOnlineEvent',
      'isOrganizer',
      'name',
      'owner',
      'requiresApproval',
      'status',
    ]);
    expect(Object.keys((response.body as { owner: object }).owner)).toEqual([
      'id',
      'name',
    ]);
  });

  it('enfileira o aviso de nova organização a quem recebe', async () => {
    const { owner, groupId, person } = await groupWith();

    await transfer(owner.cookies, groupId, person.membershipId).expect(200);

    expect(await emailJobsTo(person.email)).toEqual([
      {
        to: person.email,
        subject: 'Agora você organiza Família',
        blocks: [
          { type: 'paragraph', text: 'Olá, Bia Lima.' },
          {
            type: 'paragraph',
            text: 'Ana Souza passou para você a organização do grupo Família no Amigo Secreto.',
          },
          {
            type: 'button',
            label: 'Ver grupo',
            url: `${WEB_URL}/grupos/${groupId}`,
          },
        ],
      },
    ]);
    expect(await emailJobsTo(owner.email)).toEqual([]);
  });

  it('emite group.ownership_transferred sem dados pessoais', async () => {
    const { owner, groupId, person } = await groupWith({
      name: 'Grupo Rastreável',
    });
    const [{ inviteCode }] = await api.dataSource.query<
      { inviteCode: string }[]
    >('SELECT "inviteCode" FROM "group" WHERE id = $1', [groupId]);

    const events = await captureEvents(() =>
      transfer(owner.cookies, groupId, person.membershipId).expect(200),
    );

    const transferred = events.filter(
      (record) => record.event === 'group.ownership_transferred',
    );
    expect(transferred).toEqual([
      expect.objectContaining({
        event: 'group.ownership_transferred',
        groupId,
      }),
    ]);
    const line = JSON.stringify(transferred[0]);
    for (const personal of [
      'Grupo Rastreável',
      'Ana Souza',
      'Bia Lima',
      inviteCode,
      owner.id,
      owner.email,
      person.id,
      person.email,
      person.membershipId,
    ]) {
      expect(line).not.toContain(personal);
    }
  });

  it('não emite evento nem aviso quando a transferência é recusada', async () => {
    const closed = await groupWith({ status: 'CLOSED' });
    const forbidden = await groupWith();
    const other = await joinAs(forbidden.groupId, 'Caio Reis');
    const missing = await groupWith();

    // Se o aviso não grava, a transferência é desfeita e nenhum evento sai.
    const failing = await groupWith({ name: 'Aviso Falha' });
    await api.dataSource.query(`
      CREATE FUNCTION fail_transfer_notice() RETURNS trigger AS $$
      BEGIN
        IF NEW.payload->>'subject' LIKE '%Aviso Falha%' THEN
          RAISE EXCEPTION 'falha forçada no aviso';
        END IF;
        RETURN NEW;
      END $$ LANGUAGE plpgsql`);
    await api.dataSource.query(`
      CREATE TRIGGER fail_transfer_notice BEFORE INSERT ON job
      FOR EACH ROW EXECUTE FUNCTION fail_transfer_notice()`);

    let events: Record<string, unknown>[];
    try {
      events = await captureEvents(async () => {
        await transfer(
          closed.owner.cookies,
          closed.groupId,
          closed.person.membershipId,
        ).expect(409);
        await transfer(
          forbidden.person.cookies,
          forbidden.groupId,
          other.membershipId,
        ).expect(403);
        await transfer(
          missing.owner.cookies,
          missing.groupId,
          randomUUID(),
        ).expect(404);
        await transfer(
          failing.owner.cookies,
          failing.groupId,
          failing.person.membershipId,
        ).expect(500);
      });
    } finally {
      await api.dataSource.query('DROP TRIGGER fail_transfer_notice ON job');
      await api.dataSource.query('DROP FUNCTION fail_transfer_notice()');
    }

    for (const scenario of [closed, forbidden, missing, failing]) {
      expect(await ownerOf(scenario.groupId)).toBe(scenario.owner.id);
    }
    expect(
      await emailJobsTo(
        other.email,
        ...[closed, forbidden, missing, failing].flatMap((scenario) => [
          scenario.owner.email,
          scenario.person.email,
        ]),
      ),
    ).toEqual([]);
    expect(
      events.filter((record) => record.event === 'group.ownership_transferred'),
    ).toEqual([]);
  });

  it('duas transferências simultâneas aplicam uma e a outra recebe 403', async () => {
    const { owner, groupId, person } = await groupWith();
    const other = await joinAs(groupId, 'Caio Reis');

    const [first, second] = await inLockOrder(groupId, [
      () => transfer(owner.cookies, groupId, person.membershipId),
      () => transfer(owner.cookies, groupId, other.membershipId),
    ]);

    expect(first.status).toBe(200);
    expect(second.status).toBe(403);
    expect(second.body).toEqual({
      statusCode: 403,
      message: 'Só quem organiza pode alterar o grupo.',
      error: 'Forbidden',
    });
    expect(await ownerOf(groupId)).toBe(person.id);
    expect((await emailJobsTo(person.email)).map((job) => job.subject)).toEqual(
      ['Agora você organiza Família'],
    );
    expect(await emailJobsTo(other.email)).toEqual([]);
  });
});
