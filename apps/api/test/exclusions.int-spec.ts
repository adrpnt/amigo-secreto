import { randomUUID } from 'node:crypto';
import type { ExclusionsResponse } from '@amigo-secreto/shared';
import request from 'supertest';
import {
  type Cookies,
  type GroupSeed,
  type GroupsApi,
  insertExclusion,
  insertGroup,
  insertMembership,
  insertUser,
  openSession,
  startGroupsApi,
  stopGroupsApi,
  withSession,
} from './group-helpers.js';

const MEMBER_NOT_FOUND = 'Participante não encontrado.';
const ORGANIZER_ONLY = 'Só quem organiza pode alterar o grupo.';

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
  api = await startGroupsApi('exclusions');
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

function list(cookies: Cookies, groupId: string): request.Test {
  return withSession(
    request(api.server).get(`/groups/${groupId}/exclusions`),
    cookies,
  );
}

function add(
  cookies: Cookies,
  groupId: string,
  body: Record<string, unknown>,
): request.Test {
  return withSession(
    request(api.server).post(`/groups/${groupId}/exclusions`),
    cookies,
  ).send(body);
}

function removePair(
  cookies: Cookies,
  groupId: string,
  pairId: string,
): request.Test {
  return withSession(
    request(api.server).delete(`/groups/${groupId}/exclusions/${pairId}`),
    cookies,
  );
}

type PairRow = { id: string; userAId: string; userBId: string };

async function pairsOf(groupId: string): Promise<PairRow[]> {
  return api.dataSource.query<PairRow[]>(
    `SELECT id, "userAId", "userBId" FROM exclusion
     WHERE "groupId" = $1 ORDER BY id`,
    [groupId],
  );
}

function person(p: Person): { membershipId: string; name: string } {
  return { membershipId: p.membershipId, name: p.name };
}

describe('pares de restrição', () => {
  it('lista participantes aprovados e pares em ordem de nome, sem id de pessoa', async () => {
    const { owner, groupId } = await groupWith();
    const bruno = await joinAs(groupId, 'Bruno Lima');
    const carla = await joinAs(groupId, 'carla Dias');
    const alvaro = await joinAs(groupId, 'Álvaro Reis');
    const pending = await joinAs(groupId, 'Davi Rocha', 'PENDING');
    const rejected = await joinAs(groupId, 'Edu Prado', 'REJECTED');
    const brunoAlvaro = await insertExclusion(
      api.dataSource,
      groupId,
      bruno.id,
      alvaro.id,
    );
    const carlaOwner = await insertExclusion(
      api.dataSource,
      groupId,
      carla.id,
      owner.id,
    );

    const response = await list(owner.cookies, groupId);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      participants: [
        person(alvaro),
        person(owner),
        person(bruno),
        person(carla),
      ],
      pairs: [
        { id: brunoAlvaro, a: person(alvaro), b: person(bruno) },
        { id: carlaOwner, a: person(owner), b: person(carla) },
      ],
    });
    const text = JSON.stringify(response.body);
    for (const userId of [owner, bruno, carla, alvaro, pending, rejected].map(
      (p) => p.id,
    )) {
      expect(text).not.toContain(userId);
    }
  });

  it('quem organiza adiciona um par e a lista mostra os dois nomes', async () => {
    const { owner, groupId } = await groupWith();
    const bruno = await joinAs(groupId, 'Bruno Lima');

    const response = await add(owner.cookies, groupId, {
      a: bruno.membershipId,
      b: owner.membershipId,
    });

    expect(response.status).toBe(201);
    const [row] = await pairsOf(groupId);
    expect(response.body).toEqual({
      id: row.id,
      a: person(owner),
      b: person(bruno),
    });
    expect([row.userAId, row.userBId]).toEqual([owner.id, bruno.id].sort());
    const after = await list(owner.cookies, groupId);
    expect((after.body as ExclusionsResponse).pairs).toEqual([
      { id: row.id, a: person(owner), b: person(bruno) },
    ]);
  });

  it('recusa par sem uma das pessoas com 400 Escolha as duas pessoas do par.', async () => {
    const { owner, groupId } = await groupWith();
    const bruno = await joinAs(groupId, 'Bruno Lima');

    for (const body of [
      { a: bruno.membershipId },
      { b: bruno.membershipId },
      { a: null, b: bruno.membershipId },
      { a: bruno.membershipId, b: '' },
      {},
    ]) {
      const response = await add(owner.cookies, groupId, body);
      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        message: 'Dados inválidos.',
        fields: { a: 'Escolha as duas pessoas do par.' },
      });
    }
    expect(await pairsOf(groupId)).toEqual([]);
  });

  it('recusa a mesma pessoa duas vezes com 400 Escolha duas pessoas diferentes.', async () => {
    const { owner, groupId } = await groupWith();
    const bruno = await joinAs(groupId, 'Bruno Lima');

    const response = await add(owner.cookies, groupId, {
      a: bruno.membershipId,
      b: bruno.membershipId,
    });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      fields: { a: 'Escolha duas pessoas diferentes.' },
    });
    expect(await pairsOf(groupId)).toEqual([]);
  });

  it('recusa par repetido em qualquer ordem com 400 Esse par já está na lista.', async () => {
    const { owner, groupId } = await groupWith();
    const bruno = await joinAs(groupId, 'Bruno Lima');
    await insertExclusion(api.dataSource, groupId, owner.id, bruno.id);
    const before = await pairsOf(groupId);

    for (const body of [
      { a: owner.membershipId, b: bruno.membershipId },
      { a: bruno.membershipId, b: owner.membershipId },
    ]) {
      const response = await add(owner.cookies, groupId, body);
      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        fields: { a: 'Esse par já está na lista.' },
      });
    }
    expect(await pairsOf(groupId)).toEqual(before);
  });

  it('responde 404 Participante não encontrado. a pessoa que não é participante aprovada', async () => {
    const { owner, groupId } = await groupWith();
    const pending = await joinAs(groupId, 'Davi Rocha', 'PENDING');
    const rejected = await joinAs(groupId, 'Edu Prado', 'REJECTED');
    const other = await groupWith();
    const stranger = await joinAs(other.groupId, 'Fábio Melo');

    for (const id of [
      pending.membershipId,
      rejected.membershipId,
      stranger.membershipId,
      randomUUID(),
      'nao-e-uuid',
    ]) {
      const response = await add(owner.cookies, groupId, {
        a: owner.membershipId,
        b: id,
      });
      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({ message: MEMBER_NOT_FOUND });
    }
    expect(await pairsOf(groupId)).toEqual([]);
  });

  it('remove um par', async () => {
    const { owner, groupId } = await groupWith();
    const bruno = await joinAs(groupId, 'Bruno Lima');
    const carla = await joinAs(groupId, 'Carla Dias');
    const removed = await insertExclusion(
      api.dataSource,
      groupId,
      owner.id,
      bruno.id,
    );
    const kept = await insertExclusion(
      api.dataSource,
      groupId,
      bruno.id,
      carla.id,
    );

    const response = await removePair(owner.cookies, groupId, removed);

    expect(response.status).toBe(204);
    expect((await pairsOf(groupId)).map((row) => row.id)).toEqual([kept]);
    const after = await list(owner.cookies, groupId);
    expect((after.body as ExclusionsResponse).pairs).toEqual([
      { id: kept, a: person(bruno), b: person(carla) },
    ]);
  });

  it('remover par que não existe responde 204', async () => {
    const { owner, groupId } = await groupWith();
    const bruno = await joinAs(groupId, 'Bruno Lima');
    const other = await groupWith();
    const stranger = await joinAs(other.groupId, 'Fábio Melo');
    const otherPair = await insertExclusion(
      api.dataSource,
      other.groupId,
      other.owner.id,
      stranger.id,
    );
    const pair = await insertExclusion(
      api.dataSource,
      groupId,
      owner.id,
      bruno.id,
    );
    const first = await removePair(owner.cookies, groupId, pair);
    expect(first.status).toBe(204);

    for (const id of [pair, randomUUID(), 'nao-e-uuid', otherPair]) {
      const response = await removePair(owner.cookies, groupId, id);
      expect(response.status).toBe(204);
    }
    expect((await pairsOf(other.groupId)).map((row) => row.id)).toEqual([
      otherPair,
    ]);
  });

  it('responde 409 Para mudar as restrições, cancele o sorteio. com o grupo SORTEADO e não muda nada', async () => {
    const { owner, groupId } = await groupWith({ status: 'DRAWN' });
    const bruno = await joinAs(groupId, 'Bruno Lima');
    const carla = await joinAs(groupId, 'Carla Dias');
    const pair = await insertExclusion(
      api.dataSource,
      groupId,
      owner.id,
      bruno.id,
    );
    const before = await pairsOf(groupId);

    const created = await add(owner.cookies, groupId, {
      a: bruno.membershipId,
      b: carla.membershipId,
    });
    const removed = await removePair(owner.cookies, groupId, pair);

    for (const response of [created, removed]) {
      expect(response.status).toBe(409);
      expect(response.body).toMatchObject({
        message: 'Para mudar as restrições, cancele o sorteio.',
      });
    }
    expect(await pairsOf(groupId)).toEqual(before);
  });

  it('responde 409 Grupo encerrado não pode ser alterado. com o grupo ENCERRADO e não muda nada', async () => {
    const { owner, groupId } = await groupWith({ status: 'CLOSED' });
    const bruno = await joinAs(groupId, 'Bruno Lima');
    const carla = await joinAs(groupId, 'Carla Dias');
    const pair = await insertExclusion(
      api.dataSource,
      groupId,
      owner.id,
      bruno.id,
    );
    const before = await pairsOf(groupId);

    const created = await add(owner.cookies, groupId, {
      a: bruno.membershipId,
      b: carla.membershipId,
    });
    const removed = await removePair(owner.cookies, groupId, pair);

    for (const response of [created, removed]) {
      expect(response.status).toBe(409);
      expect(response.body).toMatchObject({
        message: 'Grupo encerrado não pode ser alterado.',
      });
    }
    expect(await pairsOf(groupId)).toEqual(before);
  });

  it('responde 403 a participante que não organiza ao ler, criar ou apagar pares', async () => {
    const { owner, groupId } = await groupWith();
    const bruno = await joinAs(groupId, 'Bruno Lima');
    const carla = await joinAs(groupId, 'Carla Dias');
    const pair = await insertExclusion(
      api.dataSource,
      groupId,
      owner.id,
      bruno.id,
    );
    const before = await pairsOf(groupId);

    const read = await list(carla.cookies, groupId);
    const created = await add(carla.cookies, groupId, {
      a: bruno.membershipId,
      b: carla.membershipId,
    });
    const removed = await removePair(carla.cookies, groupId, pair);

    for (const response of [read, created, removed]) {
      expect(response.status).toBe(403);
      expect(response.body).toMatchObject({ message: ORGANIZER_ONLY });
    }
    expect(JSON.stringify(read.body)).not.toContain('Bruno Lima');
    expect(await pairsOf(groupId)).toEqual(before);
  });
});
