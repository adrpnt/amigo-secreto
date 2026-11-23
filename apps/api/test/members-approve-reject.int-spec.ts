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

type Person = { id: string; email: string; name: string; membershipId: string };

type Scenario = {
  owner: { id: string; email: string; membershipId: string };
  groupId: string;
  cookies: Cookies;
  person: Person;
};

let api: GroupsApi;

beforeAll(async () => {
  api = await startGroupsApi('members_approve_reject');
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

// Grupo "Família" com aprovação, organizado por "Ana Souza", com a
// participação de "Bia Lima" no status pedido.
async function groupWith(
  status: Status,
  seed: Partial<GroupSeed> = {},
): Promise<Scenario> {
  const owner = await insertUser(api.dataSource, 'Ana Souza');
  const groupId = await insertGroup(api.dataSource, {
    ownerId: owner.id,
    name: 'Família',
    requiresApproval: true,
    ...seed,
  });
  const person = await insertUser(api.dataSource, 'Bia Lima');
  await insertMembership(api.dataSource, groupId, person.id, status);
  return {
    owner: { ...owner, membershipId: await membershipId(groupId, owner.id) },
    groupId,
    cookies: await openSession(api.sessions, owner.id),
    person: {
      ...person,
      name: 'Bia Lima',
      membershipId: await membershipId(groupId, person.id),
    },
  };
}

function decide(
  action: 'approve' | 'reject',
  cookies: Cookies,
  groupId: string,
  id: string,
  from: 'PENDING' | 'REJECTED' = 'PENDING',
): request.Test {
  return withSession(
    request(api.server).post(`/groups/${groupId}/members/${id}/${action}`),
    cookies,
  ).send({ from });
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

function memberItem(person: Person, status: Status): object {
  return {
    membershipId: person.membershipId,
    name: person.name,
    avatarUrl: null,
    status,
    isOrganizer: false,
  };
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

describe('aprovar e recusar', () => {
  it('aprovar passa o pendente para aprovado', async () => {
    const { groupId, cookies, person } = await groupWith('PENDING');

    const response = await decide(
      'approve',
      cookies,
      groupId,
      person.membershipId,
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual(memberItem(person, 'APPROVED'));
    expect(await statusOf(person.membershipId)).toBe('APPROVED');
  });

  it('recusar passa o pendente para recusado', async () => {
    const { groupId, cookies, person } = await groupWith('PENDING');

    const response = await decide(
      'reject',
      cookies,
      groupId,
      person.membershipId,
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual(memberItem(person, 'REJECTED'));
    expect(await statusOf(person.membershipId)).toBe('REJECTED');
  });

  it('aprovar um recusado com o grupo ABERTO passa para aprovado', async () => {
    const { groupId, cookies, person } = await groupWith('REJECTED');

    const response = await decide(
      'approve',
      cookies,
      groupId,
      person.membershipId,
      'REJECTED',
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual(memberItem(person, 'APPROVED'));
    expect(await statusOf(person.membershipId)).toBe('APPROVED');
  });

  it('responde 409 com o grupo SORTEADO ou ENCERRADO sem mudar a participação', async () => {
    for (const status of ['DRAWN', 'CLOSED'] as const) {
      for (const action of ['approve', 'reject'] as const) {
        const { groupId, cookies, person } = await groupWith('PENDING', {
          status,
        });

        const response = await decide(
          action,
          cookies,
          groupId,
          person.membershipId,
        );

        expect(response.status).toBe(409);
        expect(response.body).toEqual({
          statusCode: 409,
          message: NOT_OPEN,
          error: 'Conflict',
        });
        expect(await statusOf(person.membershipId)).toBe('PENDING');
      }
    }
  });

  it('responde 403 a participante que não organiza sem mudar a participação', async () => {
    const { groupId, person } = await groupWith('PENDING');
    const member = await insertUser(api.dataSource, 'Caio Reis');
    await insertMembership(api.dataSource, groupId, member.id, 'APPROVED');
    const memberCookies = await openSession(api.sessions, member.id);

    for (const action of ['approve', 'reject'] as const) {
      const response = await decide(
        action,
        memberCookies,
        groupId,
        person.membershipId,
      );

      expect(response.status).toBe(403);
      expect(response.body).toEqual({
        statusCode: 403,
        message: 'Só quem organiza pode alterar o grupo.',
        error: 'Forbidden',
      });
      expect(await statusOf(person.membershipId)).toBe('PENDING');
    }
  });

  it('responde 404 Participante não encontrado. a participação inexistente ou de outro grupo', async () => {
    const { groupId, cookies } = await groupWith('PENDING');
    const other = await groupWith('PENDING');

    for (const action of ['approve', 'reject'] as const) {
      for (const id of [
        randomUUID(),
        'não-é-uuid',
        other.person.membershipId,
      ]) {
        const response = await decide(action, cookies, groupId, id);

        expect(response.status).toBe(404);
        expect(response.body).toEqual({
          statusCode: 404,
          message: 'Participante não encontrado.',
          error: 'Not Found',
        });
      }
    }
    expect(await statusOf(other.person.membershipId)).toBe('PENDING');
  });

  it('responde 404 Participante não encontrado. ao recusar uma participação aprovada, inclusive a de quem organiza', async () => {
    const { groupId, cookies, person, owner } = await groupWith('APPROVED');

    for (const id of [person.membershipId, owner.membershipId]) {
      const response = await decide('reject', cookies, groupId, id);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        statusCode: 404,
        message: 'Participante não encontrado.',
        error: 'Not Found',
      });
      expect(await statusOf(id)).toBe('APPROVED');
    }
    expect(await emailJobsTo(person.email, owner.email)).toEqual([]);
  });

  it('devolve o estado atual sem novo aviso quando a participação já está no estado pedido', async () => {
    const approved = await groupWith('APPROVED');
    const rejected = await groupWith('REJECTED');

    const events = await captureEvents(async () => {
      const approve = await decide(
        'approve',
        approved.cookies,
        approved.groupId,
        approved.person.membershipId,
      );
      const reject = await decide(
        'reject',
        rejected.cookies,
        rejected.groupId,
        rejected.person.membershipId,
      );

      expect(approve.status).toBe(200);
      expect(approve.body).toEqual(memberItem(approved.person, 'APPROVED'));
      expect(reject.status).toBe(200);
      expect(reject.body).toEqual(memberItem(rejected.person, 'REJECTED'));
    });

    expect(await statusOf(approved.person.membershipId)).toBe('APPROVED');
    expect(await statusOf(rejected.person.membershipId)).toBe('REJECTED');
    expect(
      await emailJobsTo(approved.person.email, rejected.person.email),
    ).toEqual([]);
    expect(
      events.filter((record) => String(record.event).startsWith('membership.')),
    ).toEqual([]);
  });

  it('devolve o estado atual sem aviso quando a participação não está mais no status from', async () => {
    // A tela mostrava recusado, mas a pessoa ainda está pendente, e o
    // contrário.
    const pending = await groupWith('PENDING');
    const rejected = await groupWith('REJECTED');

    const events = await captureEvents(async () => {
      const approve = await decide(
        'approve',
        pending.cookies,
        pending.groupId,
        pending.person.membershipId,
        'REJECTED',
      );
      const reject = await decide(
        'reject',
        pending.cookies,
        pending.groupId,
        pending.person.membershipId,
        'REJECTED',
      );
      const approveRejected = await decide(
        'approve',
        rejected.cookies,
        rejected.groupId,
        rejected.person.membershipId,
        'PENDING',
      );

      expect(approve.status).toBe(200);
      expect(approve.body).toEqual(memberItem(pending.person, 'PENDING'));
      expect(reject.status).toBe(200);
      expect(reject.body).toEqual(memberItem(pending.person, 'PENDING'));
      expect(approveRejected.status).toBe(200);
      expect(approveRejected.body).toEqual(
        memberItem(rejected.person, 'REJECTED'),
      );
    });

    expect(await statusOf(pending.person.membershipId)).toBe('PENDING');
    expect(await statusOf(rejected.person.membershipId)).toBe('REJECTED');
    expect(
      await emailJobsTo(pending.person.email, rejected.person.email),
    ).toEqual([]);
    expect(
      events.filter((record) => String(record.event).startsWith('membership.')),
    ).toEqual([]);
  });

  it('enfileira o aviso de entrada aprovada e de entrada recusada', async () => {
    const approved = await groupWith('PENDING');
    const rejected = await groupWith('PENDING');

    await decide(
      'approve',
      approved.cookies,
      approved.groupId,
      approved.person.membershipId,
    ).expect(200);
    await decide(
      'reject',
      rejected.cookies,
      rejected.groupId,
      rejected.person.membershipId,
    ).expect(200);

    expect(await emailJobsTo(approved.person.email)).toEqual([
      {
        to: approved.person.email,
        subject: 'Você entrou no grupo Família',
        blocks: [
          { type: 'paragraph', text: 'Olá, Bia Lima.' },
          {
            type: 'paragraph',
            text: 'Ana Souza aprovou sua entrada no grupo Família no Amigo Secreto.',
          },
          {
            type: 'button',
            label: 'Ver grupo',
            url: `${WEB_URL}/grupos/${approved.groupId}`,
          },
        ],
      },
    ]);
    expect(await emailJobsTo(rejected.person.email)).toEqual([
      {
        to: rejected.person.email,
        subject: 'Sua entrada em Família não foi aprovada',
        blocks: [
          { type: 'paragraph', text: 'Olá, Bia Lima.' },
          {
            type: 'paragraph',
            text: 'Ana Souza não aprovou sua entrada no grupo Família no Amigo Secreto.',
          },
          {
            type: 'button',
            label: 'Ver meus grupos',
            url: `${WEB_URL}/grupos`,
          },
        ],
      },
    ]);
    expect(
      await emailJobsTo(approved.owner.email, rejected.owner.email),
    ).toEqual([]);
  });

  it('emite membership.approved com trigger manual e membership.rejected', async () => {
    const approved = await groupWith('PENDING', { name: 'Grupo Rastreável' });
    const rejected = await groupWith('PENDING', { name: 'Grupo Rastreável' });

    const events = await captureEvents(async () => {
      await decide(
        'approve',
        approved.cookies,
        approved.groupId,
        approved.person.membershipId,
      ).expect(200);
      await decide(
        'reject',
        rejected.cookies,
        rejected.groupId,
        rejected.person.membershipId,
      ).expect(200);
    });

    const memberships = events.filter((record) =>
      String(record.event).startsWith('membership.'),
    );
    expect(memberships).toEqual([
      expect.objectContaining({
        event: 'membership.approved',
        groupId: approved.groupId,
        trigger: 'manual',
      }),
      expect.objectContaining({
        event: 'membership.rejected',
        groupId: rejected.groupId,
      }),
    ]);
    expect(memberships[1]).not.toHaveProperty('trigger');
    for (const record of memberships) {
      const line = JSON.stringify(record);
      for (const scenario of [approved, rejected]) {
        for (const personal of [
          'Grupo Rastreável',
          'Ana Souza',
          'Bia Lima',
          scenario.owner.id,
          scenario.owner.email,
          scenario.person.id,
          scenario.person.email,
          scenario.person.membershipId,
        ]) {
          expect(line).not.toContain(personal);
        }
      }
    }
  });

  it('não emite evento nem aviso quando a ação é recusada', async () => {
    const drawn = await groupWith('PENDING', { status: 'DRAWN' });
    const forbidden = await groupWith('PENDING');
    const member = await insertUser(api.dataSource, 'Caio Reis');
    await insertMembership(
      api.dataSource,
      forbidden.groupId,
      member.id,
      'APPROVED',
    );
    const memberCookies = await openSession(api.sessions, member.id);
    const missing = await groupWith('PENDING');

    // Se o aviso não grava, a decisão é desfeita e nenhum evento sai.
    const failing = await groupWith('PENDING', { name: 'Aviso Falha' });
    await api.dataSource.query(`
      CREATE FUNCTION fail_decision_notice() RETURNS trigger AS $$
      BEGIN
        IF NEW.payload->>'subject' LIKE '%Aviso Falha%' THEN
          RAISE EXCEPTION 'falha forçada no aviso';
        END IF;
        RETURN NEW;
      END $$ LANGUAGE plpgsql`);
    await api.dataSource.query(`
      CREATE TRIGGER fail_decision_notice BEFORE INSERT ON job
      FOR EACH ROW EXECUTE FUNCTION fail_decision_notice()`);

    let events: Record<string, unknown>[];
    try {
      events = await captureEvents(async () => {
        for (const action of ['approve', 'reject'] as const) {
          await decide(
            action,
            drawn.cookies,
            drawn.groupId,
            drawn.person.membershipId,
          ).expect(409);
          await decide(
            action,
            memberCookies,
            forbidden.groupId,
            forbidden.person.membershipId,
          ).expect(403);
          await decide(
            action,
            missing.cookies,
            missing.groupId,
            randomUUID(),
          ).expect(404);
          await decide(
            action,
            failing.cookies,
            failing.groupId,
            failing.person.membershipId,
          ).expect(500);
        }
      });
    } finally {
      await api.dataSource.query('DROP TRIGGER fail_decision_notice ON job');
      await api.dataSource.query('DROP FUNCTION fail_decision_notice()');
    }

    for (const scenario of [drawn, forbidden, missing, failing]) {
      expect(await statusOf(scenario.person.membershipId)).toBe('PENDING');
      expect(await emailJobsTo(scenario.person.email)).toEqual([]);
    }
    expect(
      events.filter((record) => String(record.event).startsWith('membership.')),
    ).toEqual([]);
  });

  it('aprovar e recusar ao mesmo tempo aplica o primeiro e envia só o aviso dele', async () => {
    // Aprovar chega primeiro: a recusa encontra um aprovado.
    const approveFirst = await groupWith('PENDING');
    const [approved, lateReject] = await inLockOrder(approveFirst.groupId, [
      () =>
        decide(
          'approve',
          approveFirst.cookies,
          approveFirst.groupId,
          approveFirst.person.membershipId,
        ),
      () =>
        decide(
          'reject',
          approveFirst.cookies,
          approveFirst.groupId,
          approveFirst.person.membershipId,
        ),
    ]);

    expect(approved.status).toBe(200);
    expect(approved.body).toEqual(memberItem(approveFirst.person, 'APPROVED'));
    expect(lateReject.status).toBe(404);
    expect(await statusOf(approveFirst.person.membershipId)).toBe('APPROVED');
    expect(
      (await emailJobsTo(approveFirst.person.email)).map((job) => job.subject),
    ).toEqual(['Você entrou no grupo Família']);

    // Recusar chega primeiro: a aprovação, feita sobre o pendente que a
    // tela mostrava, encontra um recusado e devolve o estado atual.
    const rejectFirst = await groupWith('PENDING');
    const [rejected, lateApprove] = await inLockOrder(rejectFirst.groupId, [
      () =>
        decide(
          'reject',
          rejectFirst.cookies,
          rejectFirst.groupId,
          rejectFirst.person.membershipId,
        ),
      () =>
        decide(
          'approve',
          rejectFirst.cookies,
          rejectFirst.groupId,
          rejectFirst.person.membershipId,
        ),
    ]);

    expect(rejected.status).toBe(200);
    expect(rejected.body).toEqual(memberItem(rejectFirst.person, 'REJECTED'));
    expect(lateApprove.status).toBe(200);
    expect(lateApprove.body).toEqual(
      memberItem(rejectFirst.person, 'REJECTED'),
    );
    expect(await statusOf(rejectFirst.person.membershipId)).toBe('REJECTED');
    expect(
      (await emailJobsTo(rejectFirst.person.email)).map((job) => job.subject),
    ).toEqual(['Sua entrada em Família não foi aprovada']);
  });
});
