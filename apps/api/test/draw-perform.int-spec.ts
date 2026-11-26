import type { ExclusionPair } from '@amigo-secreto/shared';
import request from 'supertest';
import {
  captureEvents,
  type Cookies,
  type GroupSeed,
  type GroupsApi,
  insertDraw,
  insertExclusion,
  insertGroup,
  insertMembership,
  insertUser,
  openSession,
  startGroupsApi,
  stopGroupsApi,
  withSession,
} from './group-helpers.js';

const ORGANIZER_ONLY = 'Só quem organiza pode alterar o grupo.';
const GROUP_NOT_FOUND = 'Grupo não encontrado.';
const ALREADY_DRAWN = 'Este grupo já fez o sorteio.';
const CLOSED_GROUP = 'Grupo encerrado não pode ser alterado.';
const NOT_ENOUGH = 'O sorteio precisa de pelo menos 3 participantes aprovados.';
const PENDING = 'Aprove ou recuse os pedidos pendentes antes do sorteio.';
const INFEASIBLE = 'As restrições não permitem um sorteio válido.';
const NOT_OPEN = 'Com o sorteio feito, ninguém entra nem sai do grupo.';
const DRAWN_ENTRY = 'Este grupo já fez o sorteio e não aceita novas entradas.';
const EXCLUSIONS_LOCKED = 'Para mudar as restrições, cancele o sorteio.';
const HOUR_MS = 60 * 60 * 1000;

type Status = 'PENDING' | 'APPROVED' | 'REJECTED';

type Person = {
  id: string;
  email: string;
  name: string;
  membershipId: string;
  cookies: Cookies;
};

type Scenario = { owner: Person; groupId: string; people: Person[] };

type Assignment = { giverUserId: string; receiverUserId: string };

let api: GroupsApi;
let ipCounter = 0;

beforeAll(async () => {
  api = await startGroupsApi('draw_perform', { trustProxyHops: 1 });
});

afterAll(async () => {
  await stopGroupsApi(api);
});

function newIp(): string {
  ipCounter += 1;
  return `10.31.${Math.floor(ipCounter / 256)}.${ipCounter % 256}`;
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
  const ownerPerson: Person = {
    ...owner,
    name: 'Ana Souza',
    membershipId: await membershipId(groupId, owner.id),
    cookies: await openSession(api.sessions, owner.id),
  };
  const people = [ownerPerson];
  for (const name of NAMES.slice(0, approved - 1)) {
    people.push(await joinAs(groupId, name));
  }
  return { owner: ownerPerson, groupId, people };
}

function drawGroup(cookies: Cookies, groupId: string): request.Test {
  return withSession(
    request(api.server).post(`/groups/${groupId}/draw`),
    cookies,
  );
}

function addPair(
  cookies: Cookies,
  groupId: string,
  a: Person,
  b: Person,
): request.Test {
  return withSession(
    request(api.server).post(`/groups/${groupId}/exclusions`),
    cookies,
  ).send({ a: a.membershipId, b: b.membershipId });
}

function joinGroup(code: string, cookies: Cookies): request.Test {
  return withSession(
    request(api.server)
      .post(`/invites/${code}/join`)
      .set('X-Forwarded-For', newIp()),
    cookies,
  );
}

async function inviteCode(groupId: string): Promise<string> {
  const [row] = await api.dataSource.query<{ inviteCode: string }[]>(
    'SELECT "inviteCode" FROM "group" WHERE id = $1',
    [groupId],
  );
  return row.inviteCode;
}

async function groupStatus(groupId: string): Promise<string> {
  const [row] = await api.dataSource.query<{ status: string }[]>(
    'SELECT status FROM "group" WHERE id = $1',
    [groupId],
  );
  return row.status;
}

type DrawRow = { id: string; status: string; createdAt: Date };

async function drawsOf(groupId: string): Promise<DrawRow[]> {
  return api.dataSource.query<DrawRow[]>(
    'SELECT id, status, "createdAt" FROM draw WHERE "groupId" = $1 ORDER BY "createdAt"',
    [groupId],
  );
}

async function assignmentsOf(groupId: string): Promise<Assignment[]> {
  return api.dataSource.query<Assignment[]>(
    `SELECT a."giverUserId", a."receiverUserId" FROM assignment a
     JOIN draw d ON d.id = a."drawId"
     WHERE d."groupId" = $1 AND d.status = 'ACTIVE'`,
    [groupId],
  );
}

type ResultJob = { payload: Record<string, unknown> };

async function resultJobsOf(groupId: string): Promise<ResultJob[]> {
  return api.dataSource.query<ResultJob[]>(
    `SELECT j.payload FROM job j
     JOIN draw d ON d.id::text = j.payload->>'drawId'
     WHERE j.type = 'draw.result_email' AND d."groupId" = $1`,
    [groupId],
  );
}

async function resultJobCount(): Promise<number> {
  const [{ count }] = await api.dataSource.query<{ count: number }[]>(
    `SELECT count(*)::int AS count FROM job WHERE type = 'draw.result_email'`,
  );
  return count;
}

// Desfaz o sorteio direto no banco, para o grupo poder sortear de novo.
async function undoDraw(groupId: string): Promise<void> {
  await api.dataSource.query(
    `DELETE FROM assignment WHERE "drawId" IN
       (SELECT id FROM draw WHERE "groupId" = $1)`,
    [groupId],
  );
  await api.dataSource.query(
    `UPDATE draw SET status = 'CANCELLED', "cancelledAt" = now()
     WHERE "groupId" = $1 AND status = 'ACTIVE'`,
    [groupId],
  );
  await api.dataSource.query(
    `UPDATE "group" SET status = 'OPEN' WHERE id = $1`,
    [groupId],
  );
}

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * HOUR_MS).toISOString();
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

function joinsPair(
  assignments: Assignment[],
  first: string,
  second: string,
): boolean {
  return assignments.some(
    (row) =>
      (row.giverUserId === first && row.receiverUserId === second) ||
      (row.giverUserId === second && row.receiverUserId === first),
  );
}

function pairOf(id: string, a: Person, b: Person): ExclusionPair {
  return {
    id,
    a: { membershipId: a.membershipId, name: a.name },
    b: { membershipId: b.membershipId, name: b.name },
  };
}

describe('sortear', () => {
  it('cria a rodada ativa com um par por aprovado, inclusive quem organiza, e passa o grupo a SORTEADO', async () => {
    const { owner, groupId, people } = await groupWith(4);
    await joinAs(groupId, 'Fábio Melo', 'REJECTED');

    const response = await drawGroup(owner.cookies, groupId);

    expect(response.status).toBe(201);
    expect(await groupStatus(groupId)).toBe('DRAWN');
    const draws = await drawsOf(groupId);
    expect(draws).toHaveLength(1);
    expect(draws[0].status).toBe('ACTIVE');
    expect(response.body).toEqual({
      drawnAt: draws[0].createdAt.toISOString(),
    });
    const assignments = await assignmentsOf(groupId);
    const ids = people.map((p) => p.id).sort();
    expect(assignments.map((row) => row.giverUserId).sort()).toEqual(ids);
    expect(assignments.map((row) => row.receiverUserId).sort()).toEqual(ids);
    for (const row of assignments) {
      expect(row.receiverUserId).not.toBe(row.giverUserId);
    }
  });

  it('respeita os pares de restrição nos dois sentidos', async () => {
    for (let round = 0; round < 10; round++) {
      const { owner, groupId, people } = await groupWith(4);
      const [ana, bruno, carla, davi] = people;
      await insertExclusion(api.dataSource, groupId, ana.id, bruno.id);
      await insertExclusion(api.dataSource, groupId, davi.id, carla.id);

      await drawGroup(owner.cookies, groupId).expect(201);

      const assignments = await assignmentsOf(groupId);
      expect(assignments).toHaveLength(4);
      expect(joinsPair(assignments, ana.id, bruno.id)).toBe(false);
      expect(joinsPair(assignments, carla.id, davi.id)).toBe(false);
    }
  });

  it('grava rodada, pares e status juntos ou nada', async () => {
    const { owner, groupId } = await groupWith(3);
    await api.dataSource.query(`
      CREATE FUNCTION fail_draw_jobs() RETURNS trigger AS $$
      BEGIN
        IF NEW.type = 'draw.result_email' THEN
          RAISE EXCEPTION 'falha forçada nos e-mails do sorteio';
        END IF;
        RETURN NEW;
      END $$ LANGUAGE plpgsql`);
    await api.dataSource.query(`
      CREATE TRIGGER fail_draw_jobs BEFORE INSERT ON job
      FOR EACH ROW EXECUTE FUNCTION fail_draw_jobs()`);
    let response: request.Response;
    try {
      response = await drawGroup(owner.cookies, groupId);
    } finally {
      await api.dataSource.query('DROP TRIGGER fail_draw_jobs ON job');
      await api.dataSource.query('DROP FUNCTION fail_draw_jobs()');
    }

    expect(response.status).toBe(500);
    expect(await drawsOf(groupId)).toEqual([]);
    const [{ count }] = await api.dataSource.query<{ count: number }[]>(
      `SELECT count(*)::int AS count FROM assignment a
       JOIN draw d ON d.id = a."drawId" WHERE d."groupId" = $1`,
      [groupId],
    );
    expect(count).toBe(0);
    expect(await groupStatus(groupId)).toBe('OPEN');
  });

  it('responde 409 Este grupo já fez o sorteio. com o grupo SORTEADO', async () => {
    const { owner, groupId } = await groupWith(3, { status: 'DRAWN' });
    await insertDraw(api.dataSource, groupId);

    const response = await drawGroup(owner.cookies, groupId);

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({ message: ALREADY_DRAWN });
    expect(await drawsOf(groupId)).toHaveLength(1);
  });

  it('responde 409 Grupo encerrado não pode ser alterado. com o grupo ENCERRADO', async () => {
    const { owner, groupId } = await groupWith(3, { status: 'CLOSED' });

    const response = await drawGroup(owner.cookies, groupId);

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({ message: CLOSED_GROUP });
    expect(await drawsOf(groupId)).toEqual([]);
    expect(await groupStatus(groupId)).toBe('CLOSED');
  });

  it('aceita 3 aprovados e recusa 2 com 409 O sorteio precisa de pelo menos 3 participantes aprovados.', async () => {
    const two = await groupWith(2);
    await joinAs(two.groupId, 'Fábio Melo', 'REJECTED');
    const three = await groupWith(3);

    const refused = await drawGroup(two.owner.cookies, two.groupId);
    const accepted = await drawGroup(three.owner.cookies, three.groupId);

    expect(refused.status).toBe(409);
    expect(refused.body).toMatchObject({ message: NOT_ENOUGH });
    expect(await drawsOf(two.groupId)).toEqual([]);
    expect(await groupStatus(two.groupId)).toBe('OPEN');
    expect(accepted.status).toBe(201);
    expect(await assignmentsOf(three.groupId)).toHaveLength(3);
  });

  it('responde 409 Aprove ou recuse os pedidos pendentes antes do sorteio. com pedido pendente', async () => {
    const { owner, groupId } = await groupWith(3);
    await joinAs(groupId, 'Fábio Melo', 'PENDING');

    const response = await drawGroup(owner.cookies, groupId);

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({ message: PENDING });
    expect(await drawsOf(groupId)).toEqual([]);
    expect(await groupStatus(groupId)).toBe('OPEN');
  });

  it('responde 409 As restrições não permitem um sorteio válido. com os pares a revisar', async () => {
    const { owner, groupId, people } = await groupWith(3);
    const [ana, bruno] = people;
    const pair = await insertExclusion(
      api.dataSource,
      groupId,
      bruno.id,
      ana.id,
    );

    const response = await drawGroup(owner.cookies, groupId);

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({
      message: INFEASIBLE,
      pairsToReview: [pairOf(pair, ana, bruno)],
    });
    expect(await drawsOf(groupId)).toEqual([]);
    expect(await groupStatus(groupId)).toBe('OPEN');
  });

  it('responde a primeira condição que falha na ordem status, mínimo, pendentes, restrições', async () => {
    // Cada grupo falha na condição esperada e em todas as seguintes.
    async function failing(
      approved: number,
      seed: Partial<GroupSeed>,
      options: { pending?: boolean; pair?: boolean; draws?: number },
    ): Promise<request.Response> {
      const { owner, groupId, people } = await groupWith(approved, seed);
      if (options.pending) await joinAs(groupId, 'Fábio Melo', 'PENDING');
      if (options.pair) {
        await insertExclusion(
          api.dataSource,
          groupId,
          people[0].id,
          people[1].id,
        );
      }
      for (let index = 0; index < (options.draws ?? 0); index++) {
        await insertDraw(api.dataSource, groupId, {
          status: 'CANCELLED',
          createdAt: hoursAgo(index + 1),
        });
      }
      return drawGroup(owner.cookies, groupId);
    }
    const all = { pending: true, pair: true, draws: 5 };

    const closed = await failing(2, { status: 'CLOSED' }, all);
    const drawn = await failing(2, { status: 'DRAWN' }, all);
    const few = await failing(2, {}, all);
    const pending = await failing(3, {}, all);
    const infeasible = await failing(3, {}, { pair: true, draws: 5 });

    expect(
      [closed, drawn, few, pending, infeasible].map((r) => r.status),
    ).toEqual([409, 409, 409, 409, 409]);
    expect(
      [closed, drawn, few, pending, infeasible].map(
        (r) => (r.body as { message: string }).message,
      ),
    ).toEqual([CLOSED_GROUP, ALREADY_DRAWN, NOT_ENOUGH, PENDING, INFEASIBLE]);
  });

  it('responde 403 a participante que não organiza e 404 a quem não participa', async () => {
    const { groupId, people } = await groupWith(3);
    const outsider = await insertUser(api.dataSource, 'Fábio Melo');
    const outsiderCookies = await openSession(api.sessions, outsider.id);

    const forbidden = await drawGroup(people[1].cookies, groupId);
    const missing = await drawGroup(outsiderCookies, groupId);

    expect(forbidden.status).toBe(403);
    expect(forbidden.body).toMatchObject({ message: ORGANIZER_ONLY });
    expect(missing.status).toBe(404);
    expect(missing.body).toMatchObject({ message: GROUP_NOT_FOUND });
    expect(await drawsOf(groupId)).toEqual([]);
    expect(await groupStatus(groupId)).toBe('OPEN');
  });

  it('aceita o 5º sorteio em 24 horas e responde 429 ao 6º', async () => {
    const { owner, groupId } = await groupWith(3);
    await insertDraw(api.dataSource, groupId, {
      status: 'CANCELLED',
      createdAt: hoursAgo(25),
    });
    for (const hours of [4, 3, 2, 1]) {
      await insertDraw(api.dataSource, groupId, {
        status: 'CANCELLED',
        createdAt: hoursAgo(hours),
      });
    }

    const fifth = await drawGroup(owner.cookies, groupId);
    expect(fifth.status).toBe(201);
    await undoDraw(groupId);
    const sixth = await drawGroup(owner.cookies, groupId);

    // A rodada mais antiga das 24 horas, de 4 horas atrás, sai da janela em 20.
    expect(sixth.status).toBe(429);
    expect(sixth.body).toMatchObject({
      message: 'Muitas tentativas. Tente de novo em 1200 minutos.',
    });
    expect(sixth.headers['retry-after']).toBe('72000');
    expect(await drawsOf(groupId)).toHaveLength(6);
    expect(await groupStatus(groupId)).toBe('OPEN');
  });

  it('sorteia 1000 aprovados sem pares em menos de 2 segundos', async () => {
    const { owner, groupId } = await groupWith(1);
    await api.dataSource.query(
      `WITH people AS (
         INSERT INTO "user" (name, email, "passwordHash", "emailVerifiedAt",
           "termsVersion", "termsAcceptedAt")
         SELECT 'Pessoa ' || i, gen_random_uuid() || '@exemplo.com',
           'hash-qualquer', now(), '2026-11-19', now()
         FROM generate_series(1, 999) AS i
         RETURNING id
       )
       INSERT INTO membership ("groupId", "userId", status)
       SELECT $1, id, 'APPROVED' FROM people`,
      [groupId],
    );

    const started = performance.now();
    const response = await drawGroup(owner.cookies, groupId);
    const elapsed = performance.now() - started;

    expect(response.status).toBe(201);
    expect(elapsed).toBeLessThan(2000);
    expect(await assignmentsOf(groupId)).toHaveLength(1000);
  });

  it('com o grupo sorteado, entrar, sair e remover respondem 409', async () => {
    const { owner, groupId, people } = await groupWith(3);
    const [, bruno, carla] = people;
    await drawGroup(owner.cookies, groupId).expect(201);
    const newcomer = await insertUser(api.dataSource, 'Fábio Melo');

    const joined = await joinGroup(
      await inviteCode(groupId),
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

    expect(joined.status).toBe(409);
    expect(joined.body).toMatchObject({ message: DRAWN_ENTRY });
    for (const response of [left, removed]) {
      expect(response.status).toBe(409);
      expect(response.body).toMatchObject({ message: NOT_OPEN });
    }
    const [{ count }] = await api.dataSource.query<{ count: number }[]>(
      `SELECT count(*)::int AS count FROM membership
       WHERE "groupId" = $1 AND status = 'APPROVED'`,
      [groupId],
    );
    expect(count).toBe(3);
  });

  it('dois sorteios simultâneos criam uma rodada só e o outro recebe 409', async () => {
    const { owner, groupId } = await groupWith(3);

    const responses = await inLockOrder(groupId, [
      () => drawGroup(owner.cookies, groupId),
      () => drawGroup(owner.cookies, groupId),
    ]);

    expect(responses.map((response) => response.status)).toEqual([201, 409]);
    expect(responses[1].body).toMatchObject({ message: ALREADY_DRAWN });
    expect(await drawsOf(groupId)).toHaveLength(1);
    expect(await assignmentsOf(groupId)).toHaveLength(3);
    expect(await resultJobsOf(groupId)).toHaveLength(3);
  });

  it('pedido de entrada simultâneo ao sorteio entra antes ou recebe 409', async () => {
    // Sorteio primeiro: a entrada recebe 409 e fica de fora.
    const first = await groupWith(3);
    const late = await insertUser(api.dataSource, 'Fábio Melo');
    const lateCookies = await openSession(api.sessions, late.id);
    const lateCode = await inviteCode(first.groupId);
    const [drawn, refused] = await inLockOrder(first.groupId, [
      () => drawGroup(first.owner.cookies, first.groupId),
      () => joinGroup(lateCode, lateCookies),
    ]);

    expect(drawn.status).toBe(201);
    expect(refused.status).toBe(409);
    expect(refused.body).toMatchObject({ message: DRAWN_ENTRY });
    expect(
      (await assignmentsOf(first.groupId)).map((row) => row.giverUserId),
    ).not.toContain(late.id);

    // Entrada primeiro: com 2 aprovados, o sorteio só passa contando quem entrou.
    const second = await groupWith(2);
    const early = await insertUser(api.dataSource, 'Gabi Reis');
    const earlyCookies = await openSession(api.sessions, early.id);
    const earlyCode = await inviteCode(second.groupId);
    const [joined, accepted] = await inLockOrder(second.groupId, [
      () => joinGroup(earlyCode, earlyCookies),
      () => drawGroup(second.owner.cookies, second.groupId),
    ]);

    expect(joined.status).toBe(200);
    expect(accepted.status).toBe(201);
    expect(
      (await assignmentsOf(second.groupId)).map((row) => row.giverUserId),
    ).toContain(early.id);
  });

  it('par criado durante o sorteio entra antes ou recebe 409', async () => {
    // Sorteio primeiro: o par recebe 409 e não é gravado.
    const first = await groupWith(3);
    const [ana, bruno] = first.people;
    const [drawn, refused] = await inLockOrder(first.groupId, [
      () => drawGroup(first.owner.cookies, first.groupId),
      () => addPair(first.owner.cookies, first.groupId, ana, bruno),
    ]);

    expect(drawn.status).toBe(201);
    expect(refused.status).toBe(409);
    expect(refused.body).toMatchObject({ message: EXCLUSIONS_LOCKED });
    const [{ count }] = await api.dataSource.query<{ count: number }[]>(
      'SELECT count(*)::int AS count FROM exclusion WHERE "groupId" = $1',
      [first.groupId],
    );
    expect(count).toBe(0);

    // Par primeiro: com 3 aprovados, o par impede o sorteio, então o sorteio
    // só é recusado se considerou o par.
    const second = await groupWith(3);
    const [ana2, bruno2] = second.people;
    const [added, blocked] = await inLockOrder(second.groupId, [
      () => addPair(second.owner.cookies, second.groupId, ana2, bruno2),
      () => drawGroup(second.owner.cookies, second.groupId),
    ]);

    expect(added.status).toBe(201);
    expect(blocked.status).toBe(409);
    expect(blocked.body).toMatchObject({ message: INFEASIBLE });
    expect(await drawsOf(second.groupId)).toEqual([]);
  });

  it('enfileira um job de resultado por participante, só com ids', async () => {
    const { owner, groupId, people } = await groupWith(3);

    await drawGroup(owner.cookies, groupId).expect(201);

    const [draw] = await drawsOf(groupId);
    const jobs = await resultJobsOf(groupId);
    expect(
      jobs
        .map((job) => job.payload)
        .sort((x, y) =>
          String(x.giverUserId).localeCompare(String(y.giverUserId)),
        ),
    ).toEqual(
      people
        .map((p) => p.id)
        .sort()
        .map((giverUserId) => ({ drawId: draw.id, giverUserId })),
    );
    const text = JSON.stringify(jobs);
    for (const p of people) {
      expect(text).not.toContain(p.name);
      expect(text).not.toContain(p.email);
    }
  });

  it('emite draw.performed com groupId, participants, singleCycle e hasExclusions', async () => {
    const plain = await groupWith(3);
    const restricted = await groupWith(4);
    await insertExclusion(
      api.dataSource,
      restricted.groupId,
      restricted.people[0].id,
      restricted.people[1].id,
    );

    const events = await captureEvents(async () => {
      await drawGroup(plain.owner.cookies, plain.groupId).expect(201);
      await drawGroup(restricted.owner.cookies, restricted.groupId).expect(201);
    });

    const performed = events.filter(
      (record) => record.event === 'draw.performed',
    );
    expect(performed).toEqual([
      expect.objectContaining({
        event: 'draw.performed',
        groupId: plain.groupId,
        participants: 3,
        singleCycle: true,
        hasExclusions: false,
      }),
      expect.objectContaining({
        event: 'draw.performed',
        groupId: restricted.groupId,
        participants: 4,
        singleCycle: true,
        hasExclusions: true,
      }),
    ]);
    const line = JSON.stringify(performed);
    for (const p of [...plain.people, ...restricted.people]) {
      for (const personal of [p.id, p.name, p.email, p.membershipId]) {
        expect(line).not.toContain(personal);
      }
    }
  });

  it('não emite evento nem enfileira e-mail quando o sorteio é recusado', async () => {
    const drawn = await groupWith(3, { status: 'DRAWN' });
    await insertDraw(api.dataSource, drawn.groupId);
    const few = await groupWith(2);
    const forbidden = await groupWith(3);
    const before = await resultJobCount();

    const events = await captureEvents(async () => {
      await drawGroup(drawn.owner.cookies, drawn.groupId).expect(409);
      await drawGroup(few.owner.cookies, few.groupId).expect(409);
      await drawGroup(forbidden.people[1].cookies, forbidden.groupId).expect(
        403,
      );
    });

    expect(
      events.filter((record) => String(record.event).startsWith('draw.')),
    ).toEqual([]);
    expect(await resultJobCount()).toBe(before);
  });

  it('a resposta não contém nenhum par sorteado', async () => {
    const { owner, groupId, people } = await groupWith(4);

    const response = await drawGroup(owner.cookies, groupId);

    expect(response.status).toBe(201);
    expect(Object.keys(response.body as object)).toEqual(['drawnAt']);
    const text = JSON.stringify(response.body);
    for (const p of people) {
      expect(text).not.toContain(p.id);
      expect(text).not.toContain(p.name);
      expect(text).not.toContain(p.membershipId);
    }
  });
});
