import request from 'supertest';
import {
  type Cookies,
  type GroupsApi,
  insertUser,
  openSession,
  startGroupsApi,
  stopGroupsApi,
  withSession,
} from './group-helpers.js';

const NEXT_YEAR = new Date().getUTCFullYear() + 1;
const DRAW_AT = `${NEXT_YEAR}-12-10T20:00:00.000Z`;
const OTHER_DRAW_AT = `${NEXT_YEAR}-12-12T21:30:00.000Z`;
const EVENT_AT = `${NEXT_YEAR}-12-20T22:00:00.000Z`;

type ReminderRow = {
  status: string;
  runAt: Date;
  payload: Record<string, unknown>;
};

let api: GroupsApi;

beforeAll(async () => {
  api = await startGroupsApi('draw_reminder_schedule');
});

afterAll(async () => {
  await stopGroupsApi(api);
});

async function organizer(): Promise<Cookies> {
  const { id } = await insertUser(api.dataSource, 'Ana Souza');
  return openSession(api.sessions, id);
}

async function createGroup(cookies: Cookies, body: object): Promise<string> {
  const response = await withSession(
    request(api.server).post('/groups'),
    cookies,
  ).send({ name: 'Família', ...body });
  expect(response.status).toBe(201);
  return (response.body as { id: string }).id;
}

function updateGroup(
  cookies: Cookies,
  groupId: string,
  body: object,
): request.Test {
  return withSession(
    request(api.server).put(`/groups/${groupId}`),
    cookies,
  ).send({ name: 'Família', ...body });
}

async function remindersOf(groupId: string): Promise<ReminderRow[]> {
  return api.dataSource.query<ReminderRow[]>(
    `SELECT status, "runAt", payload FROM job
     WHERE type = 'draw.reminder' AND payload->>'groupId' = $1
     ORDER BY "createdAt"`,
    [groupId],
  );
}

describe('agendar lembrete', () => {
  it('criar grupo com sorteio previsto agenda o lembrete para a data e hora', async () => {
    const groupId = await createGroup(await organizer(), {
      drawScheduledAt: DRAW_AT,
      eventAt: EVENT_AT,
    });

    expect(await remindersOf(groupId)).toEqual([
      {
        status: 'PENDING',
        runAt: new Date(DRAW_AT),
        payload: { groupId, drawScheduledAt: DRAW_AT },
      },
    ]);
  });

  it('editar o sorteio previsto troca o lembrete pendente pelo da data nova', async () => {
    const cookies = await organizer();
    const groupId = await createGroup(cookies, {
      drawScheduledAt: DRAW_AT,
      eventAt: EVENT_AT,
    });

    await updateGroup(cookies, groupId, {
      drawScheduledAt: OTHER_DRAW_AT,
      eventAt: EVENT_AT,
    }).expect(200);

    expect(await remindersOf(groupId)).toEqual([
      {
        status: 'PENDING',
        runAt: new Date(OTHER_DRAW_AT),
        payload: { groupId, drawScheduledAt: OTHER_DRAW_AT },
      },
    ]);
  });

  it('tirar o sorteio previsto apaga o lembrete pendente', async () => {
    const cookies = await organizer();
    const groupId = await createGroup(cookies, {
      drawScheduledAt: DRAW_AT,
      eventAt: EVENT_AT,
    });

    await updateGroup(cookies, groupId, {
      drawScheduledAt: null,
      eventAt: EVENT_AT,
    }).expect(200);

    expect(await remindersOf(groupId)).toEqual([]);
  });

  it('grupo sem sorteio previsto não agenda lembrete', async () => {
    const cookies = await organizer();
    const groupId = await createGroup(cookies, { eventAt: EVENT_AT });

    // Editar outro campo também não agenda.
    await updateGroup(cookies, groupId, {
      eventAt: EVENT_AT,
      description: 'Traga um presente.',
    }).expect(200);

    expect(await remindersOf(groupId)).toEqual([]);
  });
});
