import { Logger } from '@nestjs/common';
import request from 'supertest';
import { AppLogger } from '../src/observability/app-logger.js';
import {
  type Cookies,
  type GroupsApi,
  insertGroup,
  insertMembership,
  insertUser,
  openSession,
  startGroupsApi,
  stopGroupsApi,
  withSession,
} from './group-helpers.js';

const GROUP_NOT_FOUND = 'Grupo não encontrado.';
const DRAW_NOT_FOUND = 'Sorteio não encontrado.';

type Person = {
  id: string;
  email: string;
  name: string;
  membershipId: string;
  cookies: Cookies;
};

type Scenario = { owner: Person; groupId: string; people: Person[] };

let api: GroupsApi;

beforeAll(async () => {
  api = await startGroupsApi('draw_result');
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

const NAMES = ['Bruno Lima', 'Carla Dias', 'Davi Rocha'];

// Grupo "Família", organizado por "Ana Souza", com `approved` participantes
// aprovados contando quem organiza.
async function groupWith(approved: number): Promise<Scenario> {
  const owner = await insertUser(api.dataSource, 'Ana Souza');
  const groupId = await insertGroup(api.dataSource, {
    ownerId: owner.id,
    name: 'Família',
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

// Grupo sorteado pela própria API.
async function drawnGroup(approved: number): Promise<Scenario> {
  const scenario = await groupWith(approved);
  await withSession(
    request(api.server).post(`/groups/${scenario.groupId}/draw`),
    scenario.owner.cookies,
  ).expect(201);
  return scenario;
}

function result(cookies: Cookies, groupId: string): request.Test {
  return withSession(
    request(api.server).get(`/groups/${groupId}/draw/result`),
    cookies,
  );
}

// Quem cada pessoa tirou na rodada ativa, lido direto do banco.
async function receiverOf(
  groupId: string,
  giverUserId: string,
): Promise<string> {
  const [row] = await api.dataSource.query<{ receiverUserId: string }[]>(
    `SELECT a."receiverUserId" FROM assignment a
     JOIN draw d ON d.id = a."drawId" AND d.status = 'ACTIVE'
     WHERE d."groupId" = $1 AND a."giverUserId" = $2`,
    [groupId, giverUserId],
  );
  return row.receiverUserId;
}

// Todas as linhas que a API escreve durante `action`.
async function captureOutput(action: () => Promise<unknown>): Promise<string> {
  const output: string[] = [];
  Logger.overrideLogger(new AppLogger('production'));
  const capture = (chunk: unknown) => {
    output.push(String(chunk));
    return true;
  };
  vi.spyOn(process.stdout, 'write').mockImplementation(capture);
  vi.spyOn(process.stderr, 'write').mockImplementation(capture);
  try {
    await action();
  } finally {
    vi.restoreAllMocks();
    // O app do teste sobe com logger: false.
    Logger.overrideLogger(false);
  }
  return output.join('');
}

describe('resultado do sorteio', () => {
  it('devolve a cada participante só a pessoa que ele tirou', async () => {
    const { groupId, people } = await drawnGroup(4);
    const nameOf = new Map(people.map((p) => [p.id, p.name]));

    for (const p of people) {
      const response = await result(p.cookies, groupId);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        receiverName: nameOf.get(await receiverOf(groupId, p.id)),
      });
    }
  });

  it('devolve o nome atual da pessoa sorteada', async () => {
    const { owner, groupId } = await drawnGroup(3);
    const receiverId = await receiverOf(groupId, owner.id);
    await api.dataSource.query('UPDATE "user" SET name = $1 WHERE id = $2', [
      'Nome Novo',
      receiverId,
    ]);

    const response = await result(owner.cookies, groupId);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ receiverName: 'Nome Novo' });
  });

  it('responde 404 Sorteio não encontrado. sem rodada ativa', async () => {
    const open = await groupWith(3);
    const cancelled = await drawnGroup(3);
    await withSession(
      request(api.server).delete(`/groups/${cancelled.groupId}/draw`),
      cancelled.owner.cookies,
    ).expect(204);

    for (const { groupId, people } of [open, cancelled]) {
      for (const p of people) {
        const response = await result(p.cookies, groupId);

        expect(response.status).toBe(404);
        expect(response.body).toMatchObject({ message: DRAW_NOT_FOUND });
      }
    }
  });

  it('responde 404 Grupo não encontrado. a quem não participa', async () => {
    const { groupId } = await drawnGroup(3);
    const outsider = await insertUser(api.dataSource, 'Fábio Melo');
    const cookies = await openSession(api.sessions, outsider.id);
    const pending = await insertUser(api.dataSource, 'Gabi Reis');
    await insertMembership(api.dataSource, groupId, pending.id, 'PENDING');

    for (const [who, path] of [
      [cookies, `/groups/${groupId}/draw/result`],
      [
        await openSession(api.sessions, pending.id),
        `/groups/${groupId}/draw/result`,
      ],
      [cookies, '/groups/nao-e-uuid/draw/result'],
    ] as const) {
      const response = await withSession(request(api.server).get(path), who);

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({ message: GROUP_NOT_FOUND });
      expect(JSON.stringify(response.body)).not.toContain('receiverName');
    }
  });

  it('responde com Cache-Control no-store', async () => {
    const { owner, groupId } = await drawnGroup(3);

    const response = await result(owner.cookies, groupId);

    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
  });

  it('nenhuma rota do sorteio devolve a quem organiza o par de outra pessoa', async () => {
    const { owner, groupId, people } = await drawnGroup(4);
    const others = people.filter((p) => p.id !== owner.id);
    const ownReceiver = await receiverOf(groupId, owner.id);
    const nameOf = new Map(people.map((p) => [p.id, p.name]));

    const own = await result(owner.cookies, groupId);
    expect(own.body).toEqual({ receiverName: nameOf.get(ownReceiver) });

    // Pedir o resultado apontando outra pessoa não muda a resposta.
    for (const other of others) {
      for (const query of [
        { membershipId: other.membershipId },
        { userId: other.id },
        { giverUserId: other.id },
      ]) {
        const response = await result(owner.cookies, groupId).query(query);
        expect(response.status).toBe(200);
        expect(response.body).toEqual(own.body);
      }
    }

    // Caminhos que uma rota de pares sorteados teria não existem.
    for (const path of [
      `/groups/${groupId}/draw/assignments`,
      `/groups/${groupId}/draw/results`,
      `/groups/${groupId}/draw/result/${others[0].membershipId}`,
      `/groups/${groupId}/draw/${others[0].membershipId}`,
    ]) {
      const response = await withSession(
        request(api.server).get(path),
        owner.cookies,
      );
      expect(response.status).toBe(404);
    }

    // Painel e pares de restrição não trazem par sorteado nem id de pessoa.
    for (const path of [
      `/groups/${groupId}/draw`,
      `/groups/${groupId}/exclusions`,
    ]) {
      const response = await withSession(
        request(api.server).get(path),
        owner.cookies,
      );
      expect(response.status).toBe(200);
      const text = JSON.stringify(response.body);
      expect(text).not.toContain('receiver');
      for (const p of people) {
        expect(text).not.toContain(p.id);
      }
    }
  });

  it('depois da transferência quem organiza continua vendo só o próprio par', async () => {
    const { owner, groupId, people } = await drawnGroup(3);
    const bruno = people[1];
    const nameOf = new Map(people.map((p) => [p.id, p.name]));
    await withSession(
      request(api.server).post(`/groups/${groupId}/transfer`),
      owner.cookies,
    )
      .send({ membershipId: bruno.membershipId })
      .expect(200);

    const asNewOrganizer = await result(bruno.cookies, groupId);
    const asFormerOrganizer = await result(owner.cookies, groupId);
    const panel = await withSession(
      request(api.server).get(`/groups/${groupId}/draw`),
      bruno.cookies,
    );

    expect(asNewOrganizer.body).toEqual({
      receiverName: nameOf.get(await receiverOf(groupId, bruno.id)),
    });
    expect(asFormerOrganizer.body).toEqual({
      receiverName: nameOf.get(await receiverOf(groupId, owner.id)),
    });
    expect(panel.status).toBe(200);
    expect(JSON.stringify(panel.body)).not.toContain('receiver');
  });

  it('o log de um sorteio, do resultado e do cancelamento não tem nomes nem ids de pessoa', async () => {
    const scenario = await groupWith(4);
    const { owner, groupId, people } = scenario;

    const output = await captureOutput(async () => {
      await withSession(
        request(api.server).post(`/groups/${groupId}/draw`),
        owner.cookies,
      ).expect(201);
      for (const p of people) {
        await result(p.cookies, groupId).expect(200);
      }
      await withSession(
        request(api.server).delete(`/groups/${groupId}/draw`),
        owner.cookies,
      ).expect(204);
      await result(owner.cookies, groupId).expect(404);
    });

    // A captura pegou as linhas do sorteio e do cancelamento.
    expect(output).toContain('draw.performed');
    expect(output).toContain('draw.cancelled');
    for (const p of people) {
      for (const personal of [p.id, p.name, p.email, p.membershipId]) {
        expect(output).not.toContain(personal);
      }
    }
  });
});
