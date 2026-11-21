import { randomUUID } from 'node:crypto';
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

let api: GroupsApi;

beforeAll(async () => {
  api = await startGroupsApi('groups_detail');
});

afterAll(async () => {
  await stopGroupsApi(api);
});

function getGroup(cookies: Cookies, id: string): request.Test {
  return withSession(request(api.server).get(`/groups/${id}`), cookies);
}

describe('ver grupo', () => {
  it('devolve os dados do grupo, o nome de quem organiza e isOrganizer ao participante aprovado', async () => {
    const owner = await insertUser(api.dataSource, 'Ana Souza');
    const member = await insertUser(api.dataSource, 'Bia Lima');
    const groupId = await insertGroup(api.dataSource, {
      ownerId: owner.id,
      name: 'Família',
      status: 'DRAWN',
      createdAt: '2026-11-01T12:00:00.000Z',
      description: 'Traga um presente.',
      giftMinValue: 50,
      giftMaxValue: 100,
      drawScheduledAt: '2026-12-10T20:00:00.000Z',
      eventAt: '2026-12-20T22:00:00.000Z',
      eventLocation: 'Rua das Flores, 10',
      isOnlineEvent: true,
      requiresApproval: true,
    });
    await insertMembership(api.dataSource, groupId, member.id, 'APPROVED');

    const asMember = await getGroup(
      await openSession(api.sessions, member.id),
      groupId,
    );
    const asOwner = await getGroup(
      await openSession(api.sessions, owner.id),
      groupId,
    );

    expect(asMember.status).toBe(200);
    expect(asMember.body).toEqual({
      id: groupId,
      name: 'Família',
      status: 'DRAWN',
      description: 'Traga um presente.',
      giftMinValue: 50,
      giftMaxValue: 100,
      drawScheduledAt: '2026-12-10T20:00:00.000Z',
      eventAt: '2026-12-20T22:00:00.000Z',
      eventLocation: 'Rua das Flores, 10',
      isOnlineEvent: true,
      requiresApproval: true,
      owner: { id: owner.id, name: 'Ana Souza' },
      isOrganizer: false,
      closedAt: null,
      createdAt: '2026-11-01T12:00:00.000Z',
    });
    expect(asOwner.status).toBe(200);
    expect((asOwner.body as { isOrganizer: boolean }).isOrganizer).toBe(true);
  });

  it('responde 404 igual para id inexistente, id que não é UUID e grupo de que a pessoa não participa', async () => {
    const owner = await insertUser(api.dataSource);
    const outsider = await insertUser(api.dataSource);
    const pending = await insertUser(api.dataSource);
    const groupId = await insertGroup(api.dataSource, { ownerId: owner.id });
    await insertMembership(api.dataSource, groupId, pending.id, 'PENDING');
    const outsiderCookies = await openSession(api.sessions, outsider.id);
    const notFound = {
      statusCode: 404,
      message: 'Grupo não encontrado.',
      error: 'Not Found',
    };

    const responses = [
      await getGroup(outsiderCookies, randomUUID()),
      await getGroup(outsiderCookies, 'abc'),
      await getGroup(outsiderCookies, groupId),
      await getGroup(await openSession(api.sessions, pending.id), groupId),
    ];

    for (const response of responses) {
      expect(response.status).toBe(404);
      expect(response.body).toEqual(notFound);
    }
  });

  it('devolve o recado com quebras de linha e marcação HTML como texto', async () => {
    const owner = await insertUser(api.dataSource);
    const description = '<b>Oi</b> & <script>alert(1)</script>\nSegunda linha';
    const groupId = await insertGroup(api.dataSource, {
      ownerId: owner.id,
      name: '<i>Natal</i>',
      description,
      eventLocation: '<a href="x">Casa</a>',
    });

    const response = await getGroup(
      await openSession(api.sessions, owner.id),
      groupId,
    );

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      name: '<i>Natal</i>',
      description,
      eventLocation: '<a href="x">Casa</a>',
    });
  });
});
