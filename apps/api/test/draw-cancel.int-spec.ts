import request from 'supertest';
import { JobRunner } from '../src/jobs/job-runner.service.js';
import { type FakeResend, startFakeResend } from './fake-resend.js';
import {
  captureEvents,
  type Cookies,
  type GroupSeed,
  type GroupsApi,
  insertDraw,
  insertGroup,
  insertMembership,
  insertUser,
  openSession,
  startGroupsApi,
  stopGroupsApi,
  withSession,
} from './group-helpers.js';

const WEB_URL = 'http://localhost:3000';
const ORGANIZER_ONLY = 'Só quem organiza pode alterar o grupo.';
const NOT_DRAWN = 'Este grupo ainda não fez o sorteio.';
const CLOSED_GROUP = 'Grupo encerrado não pode ser alterado.';
const MINUTE_MS = 60 * 1000;

type Person = {
  id: string;
  email: string;
  name: string;
  membershipId: string;
  cookies: Cookies;
};

type Scenario = { owner: Person; groupId: string; people: Person[] };

type DrawRow = {
  id: string;
  status: string;
  createdAt: Date;
  cancelledAt: Date | null;
};

type EmailJob = {
  to: string;
  subject: string;
  blocks: Record<string, unknown>[];
};

let api: GroupsApi;
let resend: FakeResend;
let ipCounter = 0;

beforeAll(async () => {
  // Os e-mails da fila saem pelo Resend falso, que grava cada envio.
  resend = await startFakeResend();
  vi.stubEnv('RESEND_API_KEY', 're_test_key');
  vi.stubEnv('EMAIL_FROM', 'Amigo Secreto <nao-responda@amigo.example>');
  vi.stubEnv('RESEND_BASE_URL', resend.url);
  api = await startGroupsApi('draw_cancel', { trustProxyHops: 1 });
});

afterAll(async () => {
  await stopGroupsApi(api);
  await resend.close();
});

function newIp(): string {
  ipCounter += 1;
  return `10.32.${Math.floor(ipCounter / 256)}.${ipCounter % 256}`;
}

async function membershipId(groupId: string, userId: string): Promise<string> {
  const [row] = await api.dataSource.query<{ id: string }[]>(
    'SELECT id FROM membership WHERE "groupId" = $1 AND "userId" = $2',
    [groupId, userId],
  );
  return row.id;
}

const NAMES = ['Bruno Lima', 'Carla Dias', 'Davi Rocha', 'Eva Prado'];

// Grupo "Família", organizado por "Ana Souza", com `approved` participantes
// aprovados contando quem organiza.
async function groupWith(
  approved: number,
  seed: Partial<GroupSeed> = {},
): Promise<Scenario> {
  const owner = await insertUser(api.dataSource, 'Ana Souza');
  const groupId = await insertGroup(api.dataSource, {
    ownerId: owner.id,
    name: 'Família',
    ...seed,
  });
  const people: Person[] = [
    {
      ...owner,
      name: 'Ana Souza',
      membershipId: await membershipId(groupId, owner.id),
      cookies: await openSession(api.sessions, owner.id),
    },
  ];
  for (const name of NAMES.slice(0, approved - 1)) {
    const user = await insertUser(api.dataSource, name);
    await insertMembership(api.dataSource, groupId, user.id, 'APPROVED');
    people.push({
      ...user,
      name,
      membershipId: await membershipId(groupId, user.id),
      cookies: await openSession(api.sessions, user.id),
    });
  }
  return { owner: people[0], groupId, people };
}

// Grupo sorteado pela própria API, com a rodada, os pares e os e-mails de
// resultado na fila.
async function drawnGroup(approved: number): Promise<Scenario> {
  const scenario = await groupWith(approved);
  await drawGroup(scenario.owner.cookies, scenario.groupId).expect(201);
  return scenario;
}

// Grupo SORTEADO gravado direto no banco, com a rodada feita `msAgo` atrás.
async function drawnAgo(msAgo: number): Promise<Scenario> {
  const scenario = await groupWith(3, { status: 'DRAWN' });
  const [ana, bruno, carla] = scenario.people;
  await insertDraw(api.dataSource, scenario.groupId, {
    createdAt: new Date(Date.now() - msAgo).toISOString(),
    assignments: [
      [ana.id, bruno.id],
      [bruno.id, carla.id],
      [carla.id, ana.id],
    ],
  });
  return scenario;
}

function drawGroup(cookies: Cookies, groupId: string): request.Test {
  return withSession(
    request(api.server).post(`/groups/${groupId}/draw`),
    cookies,
  );
}

function cancelDraw(cookies: Cookies, groupId: string): request.Test {
  return withSession(
    request(api.server).delete(`/groups/${groupId}/draw`),
    cookies,
  );
}

async function groupStatus(groupId: string): Promise<string> {
  const [row] = await api.dataSource.query<{ status: string }[]>(
    'SELECT status FROM "group" WHERE id = $1',
    [groupId],
  );
  return row.status;
}

async function drawsOf(groupId: string): Promise<DrawRow[]> {
  return api.dataSource.query<DrawRow[]>(
    `SELECT id, status, "createdAt", "cancelledAt" FROM draw
     WHERE "groupId" = $1 ORDER BY "createdAt"`,
    [groupId],
  );
}

async function assignmentCount(drawId: string): Promise<number> {
  const [{ count }] = await api.dataSource.query<{ count: number }[]>(
    'SELECT count(*)::int AS count FROM assignment WHERE "drawId" = $1',
    [drawId],
  );
  return count;
}

async function emailJobsTo(...emails: string[]): Promise<EmailJob[]> {
  const rows = await api.dataSource.query<{ payload: EmailJob }[]>(
    `SELECT payload FROM job
     WHERE type = 'email.send' AND payload->>'to' = ANY($1)
     ORDER BY payload->>'to'`,
    [emails],
  );
  return rows.map((row) => row.payload);
}

async function emailJobCount(): Promise<number> {
  const [{ count }] = await api.dataSource.query<{ count: number }[]>(
    `SELECT count(*)::int AS count FROM job WHERE type = 'email.send'`,
  );
  return count;
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

describe('cancelar sorteio', () => {
  it('marca a rodada como cancelada com a data, apaga os pares e volta o grupo a ABERTO', async () => {
    const { owner, groupId } = await drawnGroup(3);
    const [active] = await drawsOf(groupId);
    expect(await assignmentCount(active.id)).toBe(3);
    const before = Date.now();

    const response = await cancelDraw(owner.cookies, groupId);

    const after = Date.now();
    expect(response.status).toBe(204);
    expect(response.text).toBe('');
    const [cancelled] = await drawsOf(groupId);
    expect(cancelled).toMatchObject({ id: active.id, status: 'CANCELLED' });
    const cancelledAt = cancelled.cancelledAt!.getTime();
    // O relógio do Postgres e o do teste podem diferir em milissegundos.
    expect(cancelledAt).toBeGreaterThanOrEqual(before - 1000);
    expect(cancelledAt).toBeLessThanOrEqual(after + 1000);
    expect(await assignmentCount(active.id)).toBe(0);
    expect(await groupStatus(groupId)).toBe('OPEN');
  });

  it('grupo cancelado volta a aceitar entrada, saída, remoção e pares', async () => {
    const { owner, groupId, people } = await drawnGroup(4);
    const [ana, bruno, carla, davi] = people;
    await cancelDraw(owner.cookies, groupId).expect(204);
    const newcomer = await insertUser(api.dataSource, 'Fábio Melo');

    const joined = await withSession(
      request(api.server)
        .post(`/invites/${await inviteCode(groupId)}/join`)
        .set('X-Forwarded-For', newIp()),
      await openSession(api.sessions, newcomer.id),
    );
    const left = await withSession(
      request(api.server).post(`/groups/${groupId}/leave`),
      bruno.cookies,
    );
    const removed = await withSession(
      request(api.server).delete(
        `/groups/${groupId}/members/${carla.membershipId}`,
      ),
      owner.cookies,
    );
    const paired = await withSession(
      request(api.server).post(`/groups/${groupId}/exclusions`),
      owner.cookies,
    ).send({ a: ana.membershipId, b: davi.membershipId });

    expect(joined.status).toBe(200);
    expect(left.status).toBe(204);
    expect(removed.status).toBe(204);
    expect(paired.status).toBe(201);
    const memberships = await api.dataSource.query<
      { userId: string; status: string }[]
    >('SELECT "userId", status FROM membership WHERE "groupId" = $1', [
      groupId,
    ]);
    const statusOf = new Map(memberships.map((m) => [m.userId, m.status]));
    expect(statusOf.has(newcomer.id)).toBe(true);
    expect(statusOf.get(bruno.id)).not.toBe('APPROVED');
    expect(statusOf.get(carla.id)).toBe('REJECTED');
    const [{ count }] = await api.dataSource.query<{ count: number }[]>(
      'SELECT count(*)::int AS count FROM exclusion WHERE "groupId" = $1',
      [groupId],
    );
    expect(count).toBe(1);
  });

  it('sortear de novo cria outra rodada', async () => {
    const { owner, groupId, people } = await drawnGroup(3);
    await cancelDraw(owner.cookies, groupId).expect(204);

    await drawGroup(owner.cookies, groupId).expect(201);

    const [cancelled, active] = await drawsOf(groupId);
    expect(cancelled.status).toBe('CANCELLED');
    expect(active.status).toBe('ACTIVE');
    expect(active.id).not.toBe(cancelled.id);
    expect(await assignmentCount(cancelled.id)).toBe(0);
    const givers = await api.dataSource.query<{ giverUserId: string }[]>(
      'SELECT "giverUserId" FROM assignment WHERE "drawId" = $1',
      [active.id],
    );
    expect(givers.map((row) => row.giverUserId).sort()).toEqual(
      people.map((p) => p.id).sort(),
    );
    expect(await groupStatus(groupId)).toBe('DRAWN');
  });

  it('responde 409 Este grupo ainda não fez o sorteio. com o grupo ABERTO', async () => {
    const { owner, groupId } = await groupWith(3);
    await insertDraw(api.dataSource, groupId, { status: 'CANCELLED' });
    const before = await drawsOf(groupId);

    const response = await cancelDraw(owner.cookies, groupId);

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({ message: NOT_DRAWN });
    expect(await drawsOf(groupId)).toEqual(before);
    expect(await groupStatus(groupId)).toBe('OPEN');
  });

  it('responde 409 Grupo encerrado não pode ser alterado. com o grupo ENCERRADO', async () => {
    const { owner, groupId, people } = await groupWith(3, {
      status: 'CLOSED',
    });
    const [ana, bruno, carla] = people;
    const drawId = await insertDraw(api.dataSource, groupId, {
      assignments: [
        [ana.id, bruno.id],
        [bruno.id, carla.id],
        [carla.id, ana.id],
      ],
    });

    const response = await cancelDraw(owner.cookies, groupId);

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({ message: CLOSED_GROUP });
    const [draw] = await drawsOf(groupId);
    expect(draw).toMatchObject({ id: drawId, status: 'ACTIVE' });
    expect(draw.cancelledAt).toBeNull();
    expect(await assignmentCount(drawId)).toBe(3);
    expect(await groupStatus(groupId)).toBe('CLOSED');
  });

  it('responde 403 a participante que não organiza', async () => {
    const { groupId, people } = await drawnGroup(3);
    const [draw] = await drawsOf(groupId);

    const response = await cancelDraw(people[1].cookies, groupId);

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({ message: ORGANIZER_ONLY });
    expect(await drawsOf(groupId)).toEqual([draw]);
    expect(await assignmentCount(draw.id)).toBe(3);
    expect(await groupStatus(groupId)).toBe('DRAWN');
  });

  it('enfileira o aviso a cada participante da rodada menos quem cancelou', async () => {
    const { owner, groupId, people } = await drawnGroup(4);
    const emails = people.map((p) => p.email);

    await cancelDraw(owner.cookies, groupId).expect(204);

    const notices = await emailJobsTo(...emails);
    const expected = people
      .filter((p) => p.id !== owner.id)
      .map((p) => ({
        to: p.email,
        subject: 'O sorteio de Família foi cancelado',
        blocks: [
          {
            type: 'paragraph',
            text: 'Ana Souza cancelou o sorteio do amigo secreto Família. O nome que você tirou não vale mais. Quando houver um novo sorteio, você recebe outro e-mail.',
          },
          {
            type: 'button',
            label: 'Ver grupo',
            url: `${WEB_URL}/grupos/${groupId}/sorteio`,
          },
        ],
      }))
      .sort((x, y) => x.to.localeCompare(y.to));
    expect(notices).toEqual(expected);
  });

  it('e-mails de resultado ainda na fila não saem depois do cancelamento', async () => {
    await api.dataSource.query('DELETE FROM job');
    resend.reset();
    const { owner, groupId, people } = await drawnGroup(3);
    expect(
      await api.dataSource.query(
        `SELECT id FROM job WHERE type = 'draw.result_email'`,
      ),
    ).toHaveLength(3);
    await cancelDraw(owner.cookies, groupId).expect(204);

    await api.app.get(JobRunner).runRound(new Date(Date.now() + MINUTE_MS));

    const sent = resend.requests.map((request) => ({
      to: (request.body.to as string[])[0],
      subject: request.body.subject as string,
    }));
    expect(sent.sort((x, y) => x.to.localeCompare(y.to))).toEqual(
      people
        .filter((p) => p.id !== owner.id)
        .map((p) => ({
          to: p.email,
          subject: 'O sorteio de Família foi cancelado',
        }))
        .sort((x, y) => x.to.localeCompare(y.to)),
    );
    const results = await api.dataSource.query<{ status: string }[]>(
      `SELECT status FROM job WHERE type = 'draw.result_email'`,
    );
    expect(results.map((row) => row.status)).toEqual(['DONE', 'DONE', 'DONE']);
  });

  it('emite draw.cancelled com groupId e minutesSinceDraw', async () => {
    const older = await drawnAgo(90 * MINUTE_MS + 30 * 1000);
    const recent = await drawnAgo(59 * 1000);

    const events = await captureEvents(async () => {
      await cancelDraw(older.owner.cookies, older.groupId).expect(204);
      await cancelDraw(recent.owner.cookies, recent.groupId).expect(204);
    });

    const cancelled = events.filter(
      (record) => record.event === 'draw.cancelled',
    );
    expect(cancelled).toEqual([
      expect.objectContaining({
        event: 'draw.cancelled',
        groupId: older.groupId,
        minutesSinceDraw: 90,
      }),
      expect.objectContaining({
        event: 'draw.cancelled',
        groupId: recent.groupId,
        minutesSinceDraw: 0,
      }),
    ]);
    const line = JSON.stringify(cancelled);
    for (const p of [...older.people, ...recent.people]) {
      for (const personal of [p.id, p.name, p.email, p.membershipId]) {
        expect(line).not.toContain(personal);
      }
    }
  });

  it('não emite evento nem aviso quando o cancelamento é recusado', async () => {
    const open = await groupWith(3);
    const closed = await groupWith(3, { status: 'CLOSED' });
    await insertDraw(api.dataSource, closed.groupId);
    const forbidden = await drawnGroup(3);
    const before = await emailJobCount();

    const events = await captureEvents(async () => {
      await cancelDraw(open.owner.cookies, open.groupId).expect(409);
      await cancelDraw(closed.owner.cookies, closed.groupId).expect(409);
      await cancelDraw(forbidden.people[1].cookies, forbidden.groupId).expect(
        403,
      );
    });

    expect(
      events.filter((record) => String(record.event).startsWith('draw.')),
    ).toEqual([]);
    expect(await emailJobCount()).toBe(before);
  });

  it('dois cancelamentos simultâneos cancelam uma vez e o outro recebe 409', async () => {
    const { owner, groupId, people } = await drawnGroup(3);

    const responses = await inLockOrder(groupId, [
      () => cancelDraw(owner.cookies, groupId),
      () => cancelDraw(owner.cookies, groupId),
    ]);

    expect(responses.map((response) => response.status)).toEqual([204, 409]);
    expect(responses[1].body).toMatchObject({ message: NOT_DRAWN });
    const draws = await drawsOf(groupId);
    expect(draws.map((draw) => draw.status)).toEqual(['CANCELLED']);
    expect(await emailJobsTo(...people.map((p) => p.email))).toHaveLength(2);
    expect(await groupStatus(groupId)).toBe('OPEN');
  });
});
