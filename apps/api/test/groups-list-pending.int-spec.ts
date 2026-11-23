import request from 'supertest';
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

type Summary = {
  id: string;
  name: string;
  status: string;
  participantCount: number;
  isOrganizer: boolean;
  drawScheduledAt: string | null;
  eventAt: string | null;
  createdAt: string;
  membershipStatus: string;
  organizerName: string;
  pendingCount: number | null;
};

type MyGroups = { active: Summary[]; closed: Summary[] };

let api: GroupsApi;

beforeAll(async () => {
  api = await startGroupsApi('groups_list_pending');
});

afterAll(async () => {
  await stopGroupsApi(api);
});

async function signedIn(
  name = 'Bia Lima',
): Promise<{ id: string; cookies: Cookies }> {
  const { id } = await insertUser(api.dataSource, name);
  return { id, cookies: await openSession(api.sessions, id) };
}

async function myGroups(cookies: Cookies): Promise<MyGroups> {
  const response = await withSession(
    request(api.server).get('/groups'),
    cookies,
  );
  expect(response.status).toBe(200);
  return response.body as MyGroups;
}

function allIds(groups: MyGroups): string[] {
  return [...groups.active, ...groups.closed].map((group) => group.id);
}

describe('meus grupos com pedidos', () => {
  it('mostra em Ativos o grupo com pedido pendente, com organizerName e membershipStatus PENDING', async () => {
    const { id: ownerId } = await insertUser(api.dataSource, 'Ana Souza');
    const groupId = await insertGroup(api.dataSource, {
      ownerId,
      name: 'Família',
      requiresApproval: true,
      createdAt: '2026-11-01T12:00:00.000Z',
      drawScheduledAt: '2026-12-10T20:00:00.000Z',
      eventAt: '2026-12-20T22:00:00.000Z',
    });
    const person = await signedIn();
    await insertMembership(api.dataSource, groupId, person.id, 'PENDING');

    const groups = await myGroups(person.cookies);

    expect(groups.active).toEqual([
      {
        id: groupId,
        name: 'Família',
        status: 'OPEN',
        participantCount: 1,
        isOrganizer: false,
        drawScheduledAt: '2026-12-10T20:00:00.000Z',
        eventAt: '2026-12-20T22:00:00.000Z',
        createdAt: '2026-11-01T12:00:00.000Z',
        membershipStatus: 'PENDING',
        organizerName: 'Ana Souza',
        pendingCount: null,
      },
    ]);
    expect(groups.closed).toEqual([]);
  });

  it('não mostra grupos em que a pessoa foi recusada ou removida', async () => {
    const { id: ownerId } = await insertUser(api.dataSource, 'Ana Souza');
    const person = await signedIn();
    const rejectedIds: string[] = [];
    for (const status of ['OPEN', 'DRAWN', 'CLOSED'] as const) {
      const groupId = await insertGroup(api.dataSource, { ownerId, status });
      await insertMembership(api.dataSource, groupId, person.id, 'REJECTED');
      rejectedIds.push(groupId);
    }
    const approved = await insertGroup(api.dataSource, { ownerId });
    await insertMembership(api.dataSource, approved, person.id, 'APPROVED');

    const groups = await myGroups(person.cookies);

    expect(allIds(groups)).toEqual([approved]);
    for (const id of rejectedIds) {
      expect(allIds(groups)).not.toContain(id);
    }
  });

  it('devolve a quem organiza a contagem de pendentes e null aos outros', async () => {
    const owner = await signedIn('Ana Souza');
    const withPending = await insertGroup(api.dataSource, {
      ownerId: owner.id,
      name: 'Com pedidos',
      requiresApproval: true,
    });
    await insertGroup(api.dataSource, {
      ownerId: owner.id,
      name: 'Sem pedidos',
    });
    const member = await signedIn('Caio Reis');
    await insertMembership(api.dataSource, withPending, member.id, 'APPROVED');
    for (const name of ['Duda', 'Eva']) {
      const { id } = await insertUser(api.dataSource, name);
      await insertMembership(api.dataSource, withPending, id, 'PENDING');
    }
    const { id: rejectedId } = await insertUser(api.dataSource, 'Fábio');
    await insertMembership(api.dataSource, withPending, rejectedId, 'REJECTED');

    const ownerGroups = await myGroups(owner.cookies);
    const memberGroups = await myGroups(member.cookies);

    const byName = (groups: MyGroups, name: string) =>
      groups.active.find((group) => group.name === name);
    expect(byName(ownerGroups, 'Com pedidos')).toMatchObject({
      isOrganizer: true,
      membershipStatus: 'APPROVED',
      organizerName: 'Ana Souza',
      pendingCount: 2,
    });
    expect(byName(ownerGroups, 'Sem pedidos')).toMatchObject({
      isOrganizer: true,
      pendingCount: 0,
    });
    expect(byName(memberGroups, 'Com pedidos')).toMatchObject({
      isOrganizer: false,
      membershipStatus: 'APPROVED',
      organizerName: 'Ana Souza',
      pendingCount: null,
    });
  });

  it('não conta pendentes na contagem de participantes', async () => {
    const owner = await signedIn('Ana Souza');
    const groupId = await insertGroup(api.dataSource, {
      ownerId: owner.id,
      requiresApproval: true,
    });
    const { id: approvedId } = await insertUser(api.dataSource, 'Caio Reis');
    await insertMembership(api.dataSource, groupId, approvedId, 'APPROVED');
    const pending = await signedIn();
    await insertMembership(api.dataSource, groupId, pending.id, 'PENDING');

    const ownerGroups = await myGroups(owner.cookies);
    const pendingGroups = await myGroups(pending.cookies);

    expect(ownerGroups.active[0]).toMatchObject({
      id: groupId,
      participantCount: 2,
      pendingCount: 1,
    });
    expect(pendingGroups.active[0]).toMatchObject({
      id: groupId,
      participantCount: 2,
    });
  });

  it('pessoa pendente recebe 404 Grupo não encontrado. ao abrir o grupo', async () => {
    const { id: ownerId } = await insertUser(api.dataSource, 'Ana Souza');
    const groupId = await insertGroup(api.dataSource, {
      ownerId,
      requiresApproval: true,
    });
    const person = await signedIn();
    await insertMembership(api.dataSource, groupId, person.id, 'PENDING');

    const response = await withSession(
      request(api.server).get(`/groups/${groupId}`),
      person.cookies,
    );

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      statusCode: 404,
      message: 'Grupo não encontrado.',
      error: 'Not Found',
    });
  });
});
