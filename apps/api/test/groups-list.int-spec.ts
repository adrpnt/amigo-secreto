import request from 'supertest';
import {
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
  api = await startGroupsApi('groups_list');
});

afterAll(async () => {
  await stopGroupsApi(api);
});

async function signedIn(): Promise<{
  userId: string;
  list: () => Promise<MyGroups>;
}> {
  const { id: userId } = await insertUser(api.dataSource);
  const cookies = await openSession(api.sessions, userId);
  return {
    userId,
    list: async () => {
      const response = await withSession(
        request(api.server).get('/groups'),
        cookies,
      );
      expect(response.status).toBe(200);
      return response.body as MyGroups;
    },
  };
}

describe('meus grupos', () => {
  it('separa ativos (ABERTO e SORTEADO) de encerrados, do mais novo para o mais antigo', async () => {
    const { userId, list } = await signedIn();
    const at = (day: number) =>
      `2026-11-${String(day).padStart(2, '0')}T12:00:00.000Z`;
    const oldOpen = await insertGroup(api.dataSource, {
      ownerId: userId,
      name: 'Aberto antigo',
      createdAt: at(1),
      drawScheduledAt: '2026-12-10T20:00:00.000Z',
      eventAt: '2026-12-20T22:00:00.000Z',
    });
    const newDrawn = await insertGroup(api.dataSource, {
      ownerId: userId,
      name: 'Sorteado novo',
      status: 'DRAWN',
      createdAt: at(5),
    });
    const midOpen = await insertGroup(api.dataSource, {
      ownerId: userId,
      name: 'Aberto do meio',
      createdAt: at(3),
    });
    const oldClosed = await insertGroup(api.dataSource, {
      ownerId: userId,
      name: 'Encerrado antigo',
      status: 'CLOSED',
      createdAt: at(2),
    });
    const newClosed = await insertGroup(api.dataSource, {
      ownerId: userId,
      name: 'Encerrado novo',
      status: 'CLOSED',
      createdAt: at(4),
    });

    const groups = await list();

    expect(groups.active.map((group) => group.id)).toEqual([
      newDrawn,
      midOpen,
      oldOpen,
    ]);
    expect(groups.closed.map((group) => group.id)).toEqual([
      newClosed,
      oldClosed,
    ]);
    expect(groups.active[2]).toEqual({
      id: oldOpen,
      name: 'Aberto antigo',
      status: 'OPEN',
      participantCount: 1,
      isOrganizer: true,
      drawScheduledAt: '2026-12-10T20:00:00.000Z',
      eventAt: '2026-12-20T22:00:00.000Z',
      createdAt: at(1),
      membershipStatus: 'APPROVED',
      organizerName: 'Ana Souza',
      pendingCount: 0,
    });
    expect(groups.active[0].status).toBe('DRAWN');
    expect(groups.closed[0].status).toBe('CLOSED');
  });

  it('não lista grupo de que a pessoa não participa nem participação recusada', async () => {
    const { userId, list } = await signedIn();
    const { id: otherId } = await insertUser(api.dataSource, 'Bia');
    const mine = await insertGroup(api.dataSource, { ownerId: userId });
    await insertGroup(api.dataSource, { ownerId: otherId, name: 'De fora' });
    const rejected = await insertGroup(api.dataSource, {
      ownerId: otherId,
      name: 'Recusada',
      status: 'CLOSED',
    });
    await insertMembership(api.dataSource, rejected, userId, 'REJECTED');

    const groups = await list();

    expect(groups.active.map((group) => group.id)).toEqual([mine]);
    expect(groups.closed).toEqual([]);
  });

  it('conta só os participantes aprovados', async () => {
    const { userId, list } = await signedIn();
    const groupId = await insertGroup(api.dataSource, { ownerId: userId });
    for (const status of [
      'APPROVED',
      'APPROVED',
      'PENDING',
      'REJECTED',
    ] as const) {
      const { id } = await insertUser(api.dataSource, 'Outra pessoa');
      await insertMembership(api.dataSource, groupId, id, status);
    }

    const groups = await list();

    expect(groups.active).toHaveLength(1);
    expect(groups.active[0].participantCount).toBe(3);
  });

  it('marca isOrganizer só no grupo que a pessoa organiza', async () => {
    const { userId, list } = await signedIn();
    const { id: otherId } = await insertUser(api.dataSource, 'Bia');
    const organized = await insertGroup(api.dataSource, {
      ownerId: userId,
      createdAt: '2026-11-02T12:00:00.000Z',
    });
    const joined = await insertGroup(api.dataSource, {
      ownerId: otherId,
      createdAt: '2026-11-01T12:00:00.000Z',
    });
    await insertMembership(api.dataSource, joined, userId, 'APPROVED');

    const groups = await list();

    expect(
      groups.active.map(({ id, isOrganizer }) => ({ id, isOrganizer })),
    ).toEqual([
      { id: organized, isOrganizer: true },
      { id: joined, isOrganizer: false },
    ]);
  });

  it('devolve listas vazias para quem não participa de nenhum grupo', async () => {
    const { list } = await signedIn();

    expect(await list()).toEqual({ active: [], closed: [] });
  });
});
