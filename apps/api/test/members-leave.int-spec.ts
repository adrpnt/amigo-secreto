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
const MUST_TRANSFER = 'Transfira a organização antes de sair do grupo.';

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

type MyGroups = { active: { id: string }[]; closed: { id: string }[] };

let api: GroupsApi;
let ipCounter = 0;

beforeAll(async () => {
  api = await startGroupsApi('members_leave', { trustProxyHops: 1 });
});

afterAll(async () => {
  await stopGroupsApi(api);
});

function newIp(): string {
  ipCounter += 1;
  return `10.18.${Math.floor(ipCounter / 256)}.${ipCounter % 256}`;
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

function leaveGroup(cookies: Cookies, groupId: string): request.Test {
  return withSession(
    request(api.server).post(`/groups/${groupId}/leave`),
    cookies,
  );
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

async function membershipsOf(
  groupId: string,
  userId: string,
): Promise<{ id: string; status: string }[]> {
  return api.dataSource.query(
    'SELECT id, status FROM membership WHERE "groupId" = $1 AND "userId" = $2',
    [groupId, userId],
  );
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

async function inviteCode(groupId: string): Promise<string> {
  const [row] = await api.dataSource.query<{ inviteCode: string }[]>(
    'SELECT "inviteCode" FROM "group" WHERE id = $1',
    [groupId],
  );
  return row.inviteCode;
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

describe('sair do grupo', () => {
  it('apaga a participação e o grupo some de Meus grupos', async () => {
    const { groupId, person } = await groupWith();

    const response = await leaveGroup(person.cookies, groupId);

    expect(response.status).toBe(204);
    expect(response.text).toBe('');
    expect(await membershipsOf(groupId, person.id)).toEqual([]);
    const groups = await withSession(
      request(api.server).get('/groups'),
      person.cookies,
    );
    expect(groups.status).toBe(200);
    const body = groups.body as MyGroups;
    expect(
      [...body.active, ...body.closed].map((group) => group.id),
    ).not.toContain(groupId);
  });

  it('quem saiu abre o convite como quem nunca participou e pode entrar de novo', async () => {
    const { groupId, person } = await groupWith();
    await leaveGroup(person.cookies, groupId).expect(204);
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
    expect(view.body).toMatchObject({ viewer: 'none', groupId: null });
    expect(join.status).toBe(200);
    expect(join.body).toEqual({ status: 'APPROVED', groupId });
    const memberships = await membershipsOf(groupId, person.id);
    expect(memberships).toHaveLength(1);
    expect(memberships[0].status).toBe('APPROVED');
    expect(memberships[0].id).not.toBe(person.membershipId);
  });

  it('responde 409 com o grupo SORTEADO ou ENCERRADO e mantém a participação', async () => {
    for (const status of ['DRAWN', 'CLOSED'] as const) {
      const { groupId, person } = await groupWith({ status });

      const response = await leaveGroup(person.cookies, groupId);

      expect(response.status).toBe(409);
      expect(response.body).toEqual({
        statusCode: 409,
        message: NOT_OPEN,
        error: 'Conflict',
      });
      expect(await membershipsOf(groupId, person.id)).toEqual([
        { id: person.membershipId, status: 'APPROVED' },
      ]);
    }
  });

  it('responde 409 Transfira a organização antes de sair do grupo. a quem organiza', async () => {
    for (const status of ['OPEN', 'DRAWN', 'CLOSED'] as const) {
      const { owner, groupId } = await groupWith({ status });

      const response = await leaveGroup(owner.cookies, groupId);

      expect(response.status).toBe(409);
      expect(response.body).toEqual({
        statusCode: 409,
        message: MUST_TRANSFER,
        error: 'Conflict',
      });
      expect(await membershipsOf(groupId, owner.id)).toEqual([
        { id: owner.membershipId, status: 'APPROVED' },
      ]);
    }
  });

  it('responde 404 a quem não participa', async () => {
    const { groupId } = await groupWith();
    const outsider = await insertUser(api.dataSource, 'Caio Reis');
    const outsiderCookies = await openSession(api.sessions, outsider.id);
    const pending = await joinAs(groupId, 'Duda Melo', 'PENDING');
    const rejected = await joinAs(groupId, 'Eva Rocha', 'REJECTED');

    for (const cookies of [
      outsiderCookies,
      pending.cookies,
      rejected.cookies,
    ]) {
      const response = await leaveGroup(cookies, groupId);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        statusCode: 404,
        message: 'Grupo não encontrado.',
        error: 'Not Found',
      });
    }
    expect(await membershipsOf(groupId, pending.id)).toEqual([
      { id: pending.membershipId, status: 'PENDING' },
    ]);
    expect(await membershipsOf(groupId, rejected.id)).toEqual([
      { id: rejected.membershipId, status: 'REJECTED' },
    ]);
  });

  it('enfileira o aviso de saída a quem organiza', async () => {
    const { owner, groupId, person } = await groupWith();

    await leaveGroup(person.cookies, groupId).expect(204);

    expect(await emailJobsTo(owner.email)).toEqual([
      {
        to: owner.email,
        subject: 'Bia Lima saiu de Família',
        blocks: [
          { type: 'paragraph', text: 'Olá, Ana Souza.' },
          {
            type: 'paragraph',
            text: 'Bia Lima saiu do grupo Família no Amigo Secreto.',
          },
          {
            type: 'button',
            label: 'Ver participantes',
            url: `${WEB_URL}/grupos/${groupId}/participantes`,
          },
        ],
      },
    ]);
    expect(await emailJobsTo(person.email)).toEqual([]);
  });

  it('emite membership.left sem dados pessoais', async () => {
    const { owner, groupId, person } = await groupWith({
      name: 'Grupo Rastreável',
    });
    const code = await inviteCode(groupId);

    const events = await captureEvents(() =>
      leaveGroup(person.cookies, groupId).expect(204),
    );

    const left = events.filter((record) =>
      String(record.event).startsWith('membership.'),
    );
    expect(left).toEqual([
      expect.objectContaining({ event: 'membership.left', groupId }),
    ]);
    const line = JSON.stringify(left[0]);
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

  it('não emite evento nem aviso quando a saída é recusada', async () => {
    const drawn = await groupWith({ status: 'DRAWN' });
    const organizer = await groupWith();
    const outsider = await groupWith();
    const stranger = await insertUser(api.dataSource, 'Caio Reis');
    const strangerCookies = await openSession(api.sessions, stranger.id);

    // Se o aviso não grava, a saída é desfeita e nenhum evento sai.
    const failing = await groupWith({ name: 'Aviso Falha' });
    await api.dataSource.query(`
      CREATE FUNCTION fail_leave_notice() RETURNS trigger AS $$
      BEGIN
        IF NEW.payload->>'subject' LIKE '%Aviso Falha%' THEN
          RAISE EXCEPTION 'falha forçada no aviso';
        END IF;
        RETURN NEW;
      END $$ LANGUAGE plpgsql`);
    await api.dataSource.query(`
      CREATE TRIGGER fail_leave_notice BEFORE INSERT ON job
      FOR EACH ROW EXECUTE FUNCTION fail_leave_notice()`);

    let events: Record<string, unknown>[];
    try {
      events = await captureEvents(async () => {
        await leaveGroup(drawn.person.cookies, drawn.groupId).expect(409);
        await leaveGroup(organizer.owner.cookies, organizer.groupId).expect(
          409,
        );
        await leaveGroup(strangerCookies, outsider.groupId).expect(404);
        await leaveGroup(failing.person.cookies, failing.groupId).expect(500);
      });
    } finally {
      await api.dataSource.query('DROP TRIGGER fail_leave_notice ON job');
      await api.dataSource.query('DROP FUNCTION fail_leave_notice()');
    }

    expect(await membershipsOf(drawn.groupId, drawn.person.id)).toHaveLength(1);
    expect(
      await membershipsOf(organizer.groupId, organizer.owner.id),
    ).toHaveLength(1);
    expect(
      await membershipsOf(failing.groupId, failing.person.id),
    ).toHaveLength(1);
    expect(
      await emailJobsTo(
        ...[drawn, organizer, outsider, failing].map(
          (scenario) => scenario.owner.email,
        ),
      ),
    ).toEqual([]);
    expect(
      events.filter((record) => String(record.event).startsWith('membership.')),
    ).toEqual([]);
  });

  it('sair enquanto quem organiza remove aplica o primeiro e o segundo responde 404 ou o estado atual', async () => {
    // Sair chega primeiro: a remoção não encontra a participação apagada.
    const leaveFirst = await groupWith();
    const [left, lateRemove] = await inLockOrder(leaveFirst.groupId, [
      () => leaveGroup(leaveFirst.person.cookies, leaveFirst.groupId),
      () =>
        removeMember(
          leaveFirst.owner.cookies,
          leaveFirst.groupId,
          leaveFirst.person.membershipId,
        ),
    ]);

    expect(left.status).toBe(204);
    expect(lateRemove.status).toBe(404);
    expect(lateRemove.body).toEqual({
      statusCode: 404,
      message: 'Participante não encontrado.',
      error: 'Not Found',
    });
    expect(
      await membershipsOf(leaveFirst.groupId, leaveFirst.person.id),
    ).toEqual([]);
    expect(
      (await emailJobsTo(leaveFirst.owner.email)).map((job) => job.subject),
    ).toEqual(['Bia Lima saiu de Família']);
    expect(await emailJobsTo(leaveFirst.person.email)).toEqual([]);

    // Remover chega primeiro: quem pede para sair já não participa.
    const removeFirst = await groupWith();
    const [removed, lateLeave] = await inLockOrder(removeFirst.groupId, [
      () =>
        removeMember(
          removeFirst.owner.cookies,
          removeFirst.groupId,
          removeFirst.person.membershipId,
        ),
      () => leaveGroup(removeFirst.person.cookies, removeFirst.groupId),
    ]);

    expect(removed.status).toBe(204);
    expect(lateLeave.status).toBe(404);
    expect(lateLeave.body).toEqual({
      statusCode: 404,
      message: 'Grupo não encontrado.',
      error: 'Not Found',
    });
    expect(
      await membershipsOf(removeFirst.groupId, removeFirst.person.id),
    ).toEqual([{ id: removeFirst.person.membershipId, status: 'REJECTED' }]);
    expect(
      (await emailJobsTo(removeFirst.person.email)).map((job) => job.subject),
    ).toEqual(['Ana Souza removeu você de Família']);
    expect(await emailJobsTo(removeFirst.owner.email)).toEqual([]);
  });
});
