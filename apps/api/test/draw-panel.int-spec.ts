import request from 'supertest';
import {
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

type Status = 'PENDING' | 'APPROVED' | 'REJECTED';

type Person = {
  id: string;
  name: string;
  membershipId: string;
  cookies: Cookies;
};

type Scenario = { owner: Person; groupId: string };

let api: GroupsApi;

beforeAll(async () => {
  api = await startGroupsApi('draw_panel');
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
    id: user.id,
    name,
    membershipId: await membershipId(groupId, user.id),
    cookies: await openSession(api.sessions, user.id),
  };
}

// Grupo "Família", organizado por "Ana Souza".
async function groupWith(seed: Partial<GroupSeed> = {}): Promise<Scenario> {
  const owner = await insertUser(api.dataSource, 'Ana Souza');
  const groupId = await insertGroup(api.dataSource, {
    ownerId: owner.id,
    name: 'Família',
    ...seed,
  });
  return {
    owner: {
      id: owner.id,
      name: 'Ana Souza',
      membershipId: await membershipId(groupId, owner.id),
      cookies: await openSession(api.sessions, owner.id),
    },
    groupId,
  };
}

function panel(cookies: Cookies, groupId: string): request.Test {
  return withSession(
    request(api.server).get(`/groups/${groupId}/draw`),
    cookies,
  );
}

function person(p: Person): { membershipId: string; name: string } {
  return { membershipId: p.membershipId, name: p.name };
}

describe('painel do sorteio', () => {
  it('conta aprovados e pendentes', async () => {
    const { owner, groupId } = await groupWith();
    await joinAs(groupId, 'Bruno Lima');
    await joinAs(groupId, 'Carla Dias', 'PENDING');
    await joinAs(groupId, 'Davi Rocha', 'REJECTED');

    const few = await panel(owner.cookies, groupId);

    expect(few.status).toBe(200);
    expect(few.body).toMatchObject({ approved: 2, pending: 1 });

    await joinAs(groupId, 'Eva Prado');
    await joinAs(groupId, 'Fábio Melo');
    await joinAs(groupId, 'Gabi Reis', 'PENDING');
    const more = await panel(owner.cookies, groupId);

    expect(more.body).toMatchObject({ approved: 4, pending: 2 });
  });

  it('grupo sem pares é viável e não lista pares a revisar', async () => {
    const { owner, groupId } = await groupWith();
    await joinAs(groupId, 'Bruno Lima');
    await joinAs(groupId, 'Carla Dias');

    const response = await panel(owner.cookies, groupId);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'OPEN',
      drawnAt: null,
      approved: 3,
      pending: 0,
      feasible: true,
      pairsToReview: [],
    });
  });

  it('3 aprovados e um par não são viáveis e listam o par a revisar', async () => {
    const { owner, groupId } = await groupWith();
    const bruno = await joinAs(groupId, 'Bruno Lima');
    await joinAs(groupId, 'Carla Dias');
    const pair = await insertExclusion(
      api.dataSource,
      groupId,
      bruno.id,
      owner.id,
    );

    const response = await panel(owner.cookies, groupId);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      approved: 3,
      feasible: false,
      pairsToReview: [{ id: pair, a: person(owner), b: person(bruno) }],
    });

    await joinAs(groupId, 'Davi Rocha');
    const four = await panel(owner.cookies, groupId);

    expect(four.body).toMatchObject({ feasible: true, pairsToReview: [] });
  });

  it('lista só os pares das pessoas bloqueadas', async () => {
    // Ana e Bruno só podem tirar Carla; Davi, Eva, Fábio e Gabi não estão
    // presos, e o par Davi e Gabi não tira a opção de ninguém.
    const { owner: ana, groupId } = await groupWith();
    const bruno = await joinAs(groupId, 'Bruno Lima');
    await joinAs(groupId, 'Carla Dias');
    const davi = await joinAs(groupId, 'Davi Rocha');
    const eva = await joinAs(groupId, 'Eva Prado');
    const fabio = await joinAs(groupId, 'Fábio Melo');
    const gabi = await joinAs(groupId, 'Gabi Reis');
    const blockedPairs: [Person, Person][] = [
      [ana, bruno],
      [ana, davi],
      [ana, eva],
      [ana, fabio],
      [ana, gabi],
      [bruno, davi],
      [bruno, eva],
      [bruno, fabio],
      [bruno, gabi],
    ];
    const expected = [];
    for (const [a, b] of blockedPairs) {
      const id = await insertExclusion(api.dataSource, groupId, a.id, b.id);
      expected.push({ id, a: person(a), b: person(b) });
    }
    await insertExclusion(api.dataSource, groupId, davi.id, gabi.id);

    const response = await panel(ana.cookies, groupId);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ approved: 7, feasible: false });
    expect((response.body as { pairsToReview: unknown }).pairsToReview).toEqual(
      expected,
    );
  });

  it('devolve status e drawnAt depois do sorteio', async () => {
    const { owner, groupId } = await groupWith({ status: 'DRAWN' });
    const bruno = await joinAs(groupId, 'Bruno Lima');
    const carla = await joinAs(groupId, 'Carla Dias');
    await insertDraw(api.dataSource, groupId, {
      status: 'CANCELLED',
      createdAt: '2026-12-01T10:00:00.000Z',
    });
    await insertDraw(api.dataSource, groupId, {
      createdAt: '2026-12-02T15:30:00.000Z',
      assignments: [
        [owner.id, bruno.id],
        [bruno.id, carla.id],
        [carla.id, owner.id],
      ],
    });

    const response = await panel(owner.cookies, groupId);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: 'DRAWN',
      drawnAt: '2026-12-02T15:30:00.000Z',
      approved: 3,
      pending: 0,
    });
  });

  it('responde 403 a participante que não organiza', async () => {
    const { groupId } = await groupWith();
    const bruno = await joinAs(groupId, 'Bruno Lima');

    const response = await panel(bruno.cookies, groupId);

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({
      message: 'Só quem organiza pode alterar o grupo.',
    });
  });

  it('não contém nenhum par sorteado', async () => {
    const { owner, groupId } = await groupWith({ status: 'DRAWN' });
    const bruno = await joinAs(groupId, 'Bruno Lima');
    const carla = await joinAs(groupId, 'Carla Dias');
    const davi = await joinAs(groupId, 'Davi Rocha');
    await insertExclusion(api.dataSource, groupId, owner.id, bruno.id);
    await insertDraw(api.dataSource, groupId, {
      createdAt: '2026-12-02T15:30:00.000Z',
      assignments: [
        [owner.id, carla.id],
        [carla.id, bruno.id],
        [bruno.id, davi.id],
        [davi.id, owner.id],
      ],
    });

    const response = await panel(owner.cookies, groupId);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'DRAWN',
      drawnAt: '2026-12-02T15:30:00.000Z',
      approved: 4,
      pending: 0,
      feasible: true,
      pairsToReview: [],
    });
    const text = JSON.stringify(response.body);
    for (const p of [owner, bruno, carla, davi]) {
      expect(text).not.toContain(p.id);
      expect(text).not.toContain(p.name);
    }
  });
});
