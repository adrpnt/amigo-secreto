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

const WEB_URL = 'http://localhost:3000';
const NOT_FOUND = {
  statusCode: 404,
  message: 'Convite não encontrado.',
  error: 'Not Found',
};
const DRAWN_MESSAGE =
  'Este grupo já fez o sorteio e não aceita novas entradas.';
const CLOSED_MESSAGE = 'Este grupo foi encerrado e não aceita novas entradas.';

type EmailJob = {
  to: string;
  subject: string;
  blocks: { type: string; text?: string; label?: string; url?: string }[];
};

type MembershipRow = {
  id: string;
  status: string;
  joinedAt: Date;
};

let api: GroupsApi;
let ipCounter = 0;

beforeAll(async () => {
  api = await startGroupsApi('invites_join', { trustProxyHops: 1 });
});

afterAll(async () => {
  await stopGroupsApi(api);
});

function newIp(): string {
  ipCounter += 1;
  return `10.6.${Math.floor(ipCounter / 256)}.${ipCounter % 256}`;
}

function joinGroup(
  code: string,
  cookies: Cookies,
  ip: string = newIp(),
): request.Test {
  return withSession(
    request(api.server)
      .post(`/invites/${code}/join`)
      .set('X-Forwarded-For', ip),
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

async function membershipsOf(
  groupId: string,
  userId: string,
): Promise<MembershipRow[]> {
  return api.dataSource.query<MembershipRow[]>(
    `SELECT id, status, "joinedAt" FROM membership
     WHERE "groupId" = $1 AND "userId" = $2`,
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

// Pessoa "Bia Lima" logada.
async function guest(
  name = 'Bia Lima',
): Promise<{ id: string; email: string; cookies: Cookies }> {
  const person = await insertUser(api.dataSource, name);
  return {
    ...person,
    cookies: await openSession(api.sessions, person.id),
  };
}

// Falha a gravação do aviso cujo assunto cita o grupo `groupName`.
async function failNoticesOf(
  groupName: string,
  action: () => Promise<void>,
): Promise<void> {
  await api.dataSource.query(`
    CREATE FUNCTION fail_join_notice() RETURNS trigger AS $$
    BEGIN
      IF NEW.payload->>'subject' LIKE '%${groupName}%' THEN
        RAISE EXCEPTION 'falha forçada nos avisos';
      END IF;
      RETURN NEW;
    END $$ LANGUAGE plpgsql`);
  await api.dataSource.query(`
    CREATE TRIGGER fail_join_notice BEFORE INSERT ON job
    FOR EACH ROW EXECUTE FUNCTION fail_join_notice()`);
  try {
    await action();
  } finally {
    await api.dataSource.query('DROP TRIGGER fail_join_notice ON job');
    await api.dataSource.query('DROP FUNCTION fail_join_notice()');
  }
}

// Espera a entrada ficar parada na trava da linha do grupo.
async function waitForLockWait(): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt++) {
    const [{ waiting }] = await api.dataSource.query<{ waiting: number }[]>(
      `SELECT count(*)::int AS waiting FROM pg_stat_activity
       WHERE datname = current_database() AND wait_event_type = 'Lock'`,
    );
    if (waiting > 0) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error('A entrada não chegou a esperar a trava.');
}

describe('entrar pelo convite', () => {
  it('em grupo sem aprovação cria participação aprovada e devolve o groupId', async () => {
    const { groupId, code } = await invitedGroup();
    const person = await guest();

    const response = await joinGroup(code, person.cookies);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'APPROVED', groupId });
    const memberships = await membershipsOf(groupId, person.id);
    expect(memberships).toHaveLength(1);
    expect(memberships[0].status).toBe('APPROVED');
  });

  it('em grupo com aprovação cria participação pendente sem groupId', async () => {
    const { groupId, code } = await invitedGroup({ requiresApproval: true });
    const person = await guest();

    const response = await joinGroup(code, person.cookies);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'PENDING', groupId: null });
    const memberships = await membershipsOf(groupId, person.id);
    expect(memberships).toHaveLength(1);
    expect(memberships[0].status).toBe('PENDING');
  });

  it('aceita conta com e-mail não confirmado', async () => {
    const { groupId, code } = await invitedGroup();
    const person = await guest();
    await api.dataSource.query(
      'UPDATE "user" SET "emailVerifiedAt" = NULL WHERE id = $1',
      [person.id],
    );

    const response = await joinGroup(code, person.cookies);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'APPROVED', groupId });
    expect((await membershipsOf(groupId, person.id))[0].status).toBe(
      'APPROVED',
    );
  });

  it('devolve o estado atual a quem já é aprovado, pendente ou recusado, sem gravar nem avisar', async () => {
    for (const status of ['APPROVED', 'PENDING', 'REJECTED'] as const) {
      // Com aprovação, uma entrada nova ficaria pendente.
      const { owner, groupId, code } = await invitedGroup({
        requiresApproval: status === 'APPROVED',
      });
      const person = await guest();
      await insertMembership(api.dataSource, groupId, person.id, status);
      const before = await membershipsOf(groupId, person.id);

      const response = await joinGroup(code, person.cookies);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status,
        groupId: status === 'APPROVED' ? groupId : null,
      });
      expect(await membershipsOf(groupId, person.id)).toEqual(before);
      expect(await emailJobsTo(owner.email)).toEqual([]);
    }
  });

  it('responde 409 em grupo SORTEADO e ENCERRADO sem criar participação', async () => {
    for (const [status, message] of [
      ['DRAWN', DRAWN_MESSAGE],
      ['CLOSED', CLOSED_MESSAGE],
    ] as const) {
      const { owner, groupId, code } = await invitedGroup({ status });
      const person = await guest();

      const response = await joinGroup(code, person.cookies);

      expect(response.status).toBe(409);
      expect(response.body).toEqual({
        statusCode: 409,
        message,
        error: 'Conflict',
      });
      expect(await membershipsOf(groupId, person.id)).toEqual([]);
      expect(await emailJobsTo(owner.email)).toEqual([]);
    }
  });

  it('responde 404 Convite não encontrado. a código inexistente ou trocado sem criar participação', async () => {
    const { owner, groupId, code: oldCode } = await invitedGroup();
    await api.dataSource.query(
      'UPDATE "group" SET "inviteCode" = $1 WHERE id = $2',
      [generateInviteCode(), groupId],
    );
    const person = await guest();

    for (const code of [generateInviteCode(), oldCode, 'abc']) {
      const response = await joinGroup(code, person.cookies);

      expect(response.status).toBe(404);
      expect(response.body).toEqual(NOT_FOUND);
      expect(await membershipsOf(groupId, person.id)).toEqual([]);
      expect(await emailJobsTo(owner.email)).toEqual([]);
    }
  });

  it('responde 429 à 31ª entrada da hora da mesma conta e aceita a 30ª', async () => {
    const person = await guest();
    const statuses: number[] = [];
    for (let entry = 1; entry <= 30; entry++) {
      const { code } = await invitedGroup();
      statuses.push((await joinGroup(code, person.cookies)).status);
    }
    const { owner, groupId, code } = await invitedGroup();

    const last = await joinGroup(code, person.cookies);

    expect(statuses).toEqual(Array.from({ length: 30 }, () => 200));
    expect(last.status).toBe(429);
    expect(last.body).toEqual({
      statusCode: 429,
      message: 'Muitas tentativas. Tente de novo em 60 minutos.',
      error: 'Too Many Requests',
    });
    expect(Number(last.headers['retry-after'])).toBeGreaterThan(3500);
    expect(await membershipsOf(groupId, person.id)).toEqual([]);
    expect(await emailJobsTo(owner.email)).toEqual([]);
  });

  it('não conta no limite da conta a entrada em que a pessoa já participava', async () => {
    const person = await guest();
    const { groupId, code } = await invitedGroup();
    await insertMembership(api.dataSource, groupId, person.id, 'APPROVED');
    for (let entry = 1; entry <= 31; entry++) {
      await joinGroup(code, person.cookies).expect(200);
    }
    const fresh = await invitedGroup();

    const response = await joinGroup(fresh.code, person.cookies);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'APPROVED',
      groupId: fresh.groupId,
    });
  });

  it('conta no limite por IP de abrir convite e responde 429 antes de procurar o código', async () => {
    const { owner, groupId, code } = await invitedGroup();
    const person = await guest();
    const ip = newIp();
    for (let attempt = 1; attempt <= 30; attempt++) {
      await request(api.server)
        .get(`/invites/${generateInviteCode()}`)
        .set('X-Forwarded-For', ip)
        .expect(404);
    }
    for (let attempt = 1; attempt <= 30; attempt++) {
      await joinGroup(generateInviteCode(), person.cookies, ip).expect(404);
    }

    const existing = await joinGroup(code, person.cookies, ip);
    const missing = await joinGroup(generateInviteCode(), person.cookies, ip);
    const opened = await request(api.server)
      .get(`/invites/${code}`)
      .set('X-Forwarded-For', ip);

    for (const response of [existing, missing, opened]) {
      expect(response.status).toBe(429);
      expect(response.body).toEqual({
        statusCode: 429,
        message: 'Muitas tentativas. Tente de novo em 1 minuto.',
        error: 'Too Many Requests',
      });
    }
    expect(await membershipsOf(groupId, person.id)).toEqual([]);
    expect(await emailJobsTo(owner.email)).toEqual([]);
  });

  it('enfileira na mesma transação o aviso de pedido a quem organiza', async () => {
    const { owner, groupId, code } = await invitedGroup({
      requiresApproval: true,
    });
    const person = await guest();

    await joinGroup(code, person.cookies).expect(200);

    expect(await emailJobsTo(owner.email)).toEqual([
      {
        to: owner.email,
        subject: 'Bia Lima pediu para entrar em Família',
        blocks: [
          { type: 'paragraph', text: 'Olá, Ana Souza.' },
          {
            type: 'paragraph',
            text: 'Bia Lima pediu para entrar no grupo Família no Amigo Secreto.',
          },
          {
            type: 'button',
            label: 'Ver pedidos',
            url: `${WEB_URL}/grupos/${groupId}/participantes`,
          },
        ],
      },
    ]);

    // Se o aviso não grava, a participação também não fica.
    const failing = await invitedGroup({
      name: 'Pedido Falho',
      requiresApproval: true,
    });
    const other = await guest();
    await failNoticesOf('Pedido Falho', async () => {
      await joinGroup(failing.code, other.cookies).expect(500);
    });
    expect(await membershipsOf(failing.groupId, other.id)).toEqual([]);
    expect(await emailJobsTo(failing.owner.email)).toEqual([]);
  });

  it('enfileira na mesma transação o aviso de entrada a quem organiza', async () => {
    const { owner, groupId, code } = await invitedGroup();
    const person = await guest();

    await joinGroup(code, person.cookies).expect(200);

    expect(await emailJobsTo(owner.email)).toEqual([
      {
        to: owner.email,
        subject: 'Bia Lima entrou em Família',
        blocks: [
          { type: 'paragraph', text: 'Olá, Ana Souza.' },
          {
            type: 'paragraph',
            text: 'Bia Lima entrou no grupo Família pelo link de convite.',
          },
          {
            type: 'button',
            label: 'Ver participantes',
            url: `${WEB_URL}/grupos/${groupId}/participantes`,
          },
        ],
      },
    ]);

    const failing = await invitedGroup({ name: 'Entrada Falha' });
    const other = await guest();
    await failNoticesOf('Entrada Falha', async () => {
      await joinGroup(failing.code, other.cookies).expect(500);
    });
    expect(await membershipsOf(failing.groupId, other.id)).toEqual([]);
    expect(await emailJobsTo(failing.owner.email)).toEqual([]);
  });

  it('não enfileira aviso quando a entrada é recusada', async () => {
    const drawn = await invitedGroup({ status: 'DRAWN' });
    const changed = await invitedGroup();
    await api.dataSource.query(
      'UPDATE "group" SET "inviteCode" = $1 WHERE id = $2',
      [generateInviteCode(), changed.groupId],
    );
    const person = await guest();

    await joinGroup(drawn.code, person.cookies).expect(409);
    await joinGroup(changed.code, person.cookies).expect(404);

    expect(await emailJobsTo(drawn.owner.email, changed.owner.email)).toEqual(
      [],
    );
  });

  it('emite membership.requested e membership.joined sem dados pessoais', async () => {
    const withApproval = await invitedGroup({
      name: 'Grupo Rastreável',
      requiresApproval: true,
    });
    const open = await invitedGroup({ name: 'Grupo Rastreável' });
    const person = await guest('Pessoa Rastreável');

    const events = await captureEvents(async () => {
      await joinGroup(withApproval.code, person.cookies).expect(200);
      await joinGroup(open.code, person.cookies).expect(200);
    });

    const membershipEvents = events.filter((record) =>
      String(record.event).startsWith('membership.'),
    );
    expect(membershipEvents).toHaveLength(2);
    expect(membershipEvents[0]).toMatchObject({
      event: 'membership.requested',
      groupId: withApproval.groupId,
    });
    expect(membershipEvents[1]).toMatchObject({
      event: 'membership.joined',
      groupId: open.groupId,
    });
    for (const record of membershipEvents) {
      const line = JSON.stringify(record);
      for (const personal of [
        'Grupo Rastreável',
        'Pessoa Rastreável',
        'Ana Souza',
        person.id,
        person.email,
        withApproval.code,
        open.code,
        withApproval.owner.id,
        open.owner.id,
      ]) {
        expect(line).not.toContain(personal);
      }
    }
  });

  it('não emite evento quando a entrada é recusada', async () => {
    const drawn = await invitedGroup({ status: 'DRAWN' });
    const member = await invitedGroup();
    const person = await guest();
    await insertMembership(
      api.dataSource,
      member.groupId,
      person.id,
      'PENDING',
    );

    const events = await captureEvents(async () => {
      await joinGroup(drawn.code, person.cookies).expect(409);
      await joinGroup(generateInviteCode(), person.cookies).expect(404);
      await joinGroup(member.code, person.cookies).expect(200);
    });

    expect(
      events.filter((record) => String(record.event).startsWith('membership.')),
    ).toEqual([]);
  });

  it('duas entradas simultâneas da mesma pessoa criam uma participação e um aviso', async () => {
    const { owner, groupId, code } = await invitedGroup();
    const person = await guest();

    const responses = await Promise.all([
      joinGroup(code, person.cookies).then((response) => response),
      joinGroup(code, person.cookies).then((response) => response),
    ]);

    for (const response of responses) {
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'APPROVED', groupId });
    }
    expect(await membershipsOf(groupId, person.id)).toHaveLength(1);
    expect(await emailJobsTo(owner.email)).toHaveLength(1);
  });

  it('entrada simultânea à mudança para SORTEADO cria antes ou responde 409', async () => {
    const { owner, groupId, code } = await invitedGroup();
    const person = await guest();
    const draw = api.dataSource.createQueryRunner();
    await draw.connect();
    try {
      await draw.startTransaction();
      await draw.query('SELECT id FROM "group" WHERE id = $1 FOR UPDATE', [
        groupId,
      ]);
      await draw.query(`UPDATE "group" SET status = 'DRAWN' WHERE id = $1`, [
        groupId,
      ]);
      const pending = joinGroup(code, person.cookies).then(
        (response) => response,
      );
      await waitForLockWait();
      await draw.commitTransaction();

      const response = await pending;

      expect(response.status).toBe(409);
      expect(response.body).toEqual({
        statusCode: 409,
        message: DRAWN_MESSAGE,
        error: 'Conflict',
      });
      expect(await membershipsOf(groupId, person.id)).toEqual([]);
      expect(await emailJobsTo(owner.email)).toEqual([]);
    } finally {
      await draw.release();
    }

    // Na ordem inversa, a entrada acontece antes do sorteio.
    const other = await invitedGroup();
    const late = await guest();
    await joinGroup(other.code, late.cookies).expect(200);
    await api.dataSource.query(
      `UPDATE "group" SET status = 'DRAWN' WHERE id = $1`,
      [other.groupId],
    );
    expect((await membershipsOf(other.groupId, late.id))[0].status).toBe(
      'APPROVED',
    );
  });

  it('responde 401 sem sessão', async () => {
    const { owner, groupId, code } = await invitedGroup();

    const response = await request(api.server)
      .post(`/invites/${code}/join`)
      .set('X-Forwarded-For', newIp());

    expect(response.status).toBe(401);
    expect(
      await api.dataSource.query(
        'SELECT id FROM membership WHERE "groupId" = $1 AND "userId" <> $2',
        [groupId, owner.id],
      ),
    ).toEqual([]);
  });
});
