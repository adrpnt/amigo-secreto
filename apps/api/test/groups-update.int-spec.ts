import pg from 'pg';
import request from 'supertest';
import {
  captureEvents,
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

const NEXT_YEAR = new Date().getUTCFullYear() + 1;
const DRAW_AT = `${NEXT_YEAR}-12-10T20:00:00.000Z`;
const EVENT_AT = `${NEXT_YEAR}-12-20T22:00:00.000Z`;
const PAST_EVENT = '2025-12-20T22:00:00.000Z';

const FULL_BODY = {
  name: 'Firma',
  description: 'Traga um presente.\nSem pegadinha.',
  giftMinValue: 50,
  giftMaxValue: 100,
  drawScheduledAt: DRAW_AT,
  eventAt: EVENT_AT,
  eventLocation: 'Rua das Flores, 10',
  isOnlineEvent: true,
  requiresApproval: true,
};

let api: GroupsApi;

beforeAll(async () => {
  api = await startGroupsApi('groups_update');
});

afterAll(async () => {
  await stopGroupsApi(api);
});

function updateGroup(cookies: Cookies, id: string, body: object): request.Test {
  return withSession(request(api.server).put(`/groups/${id}`), cookies).send(
    body,
  );
}

async function groupRow(id: string): Promise<Record<string, unknown>> {
  const [row] = await api.dataSource.query<Record<string, unknown>[]>(
    'SELECT * FROM "group" WHERE id = $1',
    [id],
  );
  return row;
}

async function organizerWithGroup(
  seed: Partial<Parameters<typeof insertGroup>[1]> = {},
): Promise<{ ownerId: string; groupId: string; cookies: Cookies }> {
  const { id: ownerId } = await insertUser(api.dataSource, 'Ana Souza');
  const groupId = await insertGroup(api.dataSource, { ownerId, ...seed });
  return {
    ownerId,
    groupId,
    cookies: await openSession(api.sessions, ownerId),
  };
}

describe('editar grupo', () => {
  it('grava os campos enviados em grupo ABERTO', async () => {
    const { ownerId, groupId, cookies } = await organizerWithGroup({
      name: 'Família',
    });

    const response = await updateGroup(cookies, groupId, FULL_BODY);

    expect(response.status).toBe(200);
    expect(await groupRow(groupId)).toMatchObject({
      name: 'Firma',
      description: 'Traga um presente.\nSem pegadinha.',
      giftMinValue: 50,
      giftMaxValue: 100,
      drawScheduledAt: new Date(DRAW_AT),
      eventAt: new Date(EVENT_AT),
      eventLocation: 'Rua das Flores, 10',
      isOnlineEvent: true,
      requiresApproval: true,
      status: 'OPEN',
    });
    expect(response.body).toMatchObject({
      id: groupId,
      ...FULL_BODY,
      status: 'OPEN',
      owner: { id: ownerId, name: 'Ana Souza' },
      isOrganizer: true,
    });
  });

  it('grava os campos enviados em grupo SORTEADO', async () => {
    const { groupId, cookies } = await organizerWithGroup({
      status: 'DRAWN',
    });

    const response = await updateGroup(cookies, groupId, FULL_BODY);

    expect(response.status).toBe(200);
    expect(await groupRow(groupId)).toMatchObject({
      name: 'Firma',
      eventLocation: 'Rua das Flores, 10',
      eventAt: new Date(EVENT_AT),
      status: 'DRAWN',
    });
  });

  it('apaga o campo opcional enviado como null', async () => {
    const { groupId, cookies } = await organizerWithGroup({
      description: 'Recado',
      giftMinValue: 50,
      giftMaxValue: 100,
      drawScheduledAt: DRAW_AT,
      eventAt: EVENT_AT,
      eventLocation: 'Casa da Ana',
      isOnlineEvent: true,
      requiresApproval: true,
    });

    const response = await updateGroup(cookies, groupId, {
      name: 'Família',
      description: null,
      giftMinValue: null,
      giftMaxValue: null,
      drawScheduledAt: null,
      eventAt: null,
      eventLocation: null,
      isOnlineEvent: false,
      requiresApproval: false,
    });

    expect(response.status).toBe(200);
    expect(await groupRow(groupId)).toMatchObject({
      description: null,
      giftMinValue: null,
      giftMaxValue: null,
      drawScheduledAt: null,
      eventAt: null,
      eventLocation: null,
      isOnlineEvent: false,
      requiresApproval: false,
    });
  });

  it('recusa com 400 a mesma regra da criação e não altera o grupo', async () => {
    const { groupId, cookies } = await organizerWithGroup({ name: 'Família' });
    const before = await groupRow(groupId);
    const cases: [object, Record<string, string>][] = [
      [{ name: '  ' }, { name: 'Informe um nome de 1 a 80 caracteres.' }],
      [
        { name: 'Família', description: 'a'.repeat(1001) },
        { description: 'Use no máximo 1.000 caracteres.' },
      ],
      [
        { name: 'Família', giftMinValue: 0, giftMaxValue: 100 },
        { giftMinValue: 'Informe um valor inteiro de R$ 1 a R$ 100.000.' },
      ],
      [
        { name: 'Família', giftMaxValue: 100 },
        { giftMinValue: 'Informe o valor inicial da faixa.' },
      ],
      [
        { name: 'Família', giftMinValue: 101, giftMaxValue: 100 },
        { giftMinValue: 'O valor inicial não pode passar do valor final.' },
      ],
      [
        { name: 'Família', drawScheduledAt: EVENT_AT, eventAt: DRAW_AT },
        {
          drawScheduledAt:
            'O sorteio previsto precisa ser antes da confraternização.',
        },
      ],
      [
        { name: 'Família', eventLocation: 'a'.repeat(201) },
        { eventLocation: 'Use no máximo 200 caracteres.' },
      ],
    ];

    for (const [body, fields] of cases) {
      const response = await updateGroup(cookies, groupId, body);
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        statusCode: 400,
        message: 'Dados inválidos.',
        error: 'Bad Request',
        fields,
      });
      expect(await groupRow(groupId)).toEqual(before);
    }
  });

  it('aceita uma data gravada que ficou no passado quando ela não muda', async () => {
    const { groupId, cookies } = await organizerWithGroup({
      eventAt: PAST_EVENT,
    });

    // O mesmo instante, escrito no horário de Brasília.
    const response = await updateGroup(cookies, groupId, {
      name: 'Família renomeada',
      eventAt: '2025-12-20T19:00:00-03:00',
    });

    expect(response.status).toBe(200);
    expect(await groupRow(groupId)).toMatchObject({
      name: 'Família renomeada',
      eventAt: new Date(PAST_EVENT),
    });
  });

  it('recusa com 400 uma data alterada para o passado', async () => {
    const { groupId, cookies } = await organizerWithGroup({
      name: 'Família',
      eventAt: PAST_EVENT,
    });
    const before = await groupRow(groupId);

    const response = await updateGroup(cookies, groupId, {
      name: 'Família',
      eventAt: '2025-12-21T22:00:00.000Z',
    });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      fields: { eventAt: 'Escolha uma data no futuro.' },
    });
    expect(await groupRow(groupId)).toEqual(before);
  });

  it('responde 403 ao participante que não organiza e não altera o grupo', async () => {
    const { groupId } = await organizerWithGroup({ name: 'Família' });
    const { id: memberId } = await insertUser(api.dataSource, 'Bia');
    await insertMembership(api.dataSource, groupId, memberId, 'APPROVED');
    const before = await groupRow(groupId);

    const response = await updateGroup(
      await openSession(api.sessions, memberId),
      groupId,
      { name: 'Tomado' },
    );

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      statusCode: 403,
      message: 'Só quem organiza pode alterar o grupo.',
      error: 'Forbidden',
    });
    expect(await groupRow(groupId)).toEqual(before);
  });

  it('responde 409 em grupo ENCERRADO e não altera o grupo', async () => {
    const { groupId, cookies } = await organizerWithGroup({
      name: 'Família',
      status: 'CLOSED',
    });
    const before = await groupRow(groupId);

    const response = await updateGroup(cookies, groupId, { name: 'Outro' });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      statusCode: 409,
      message: 'Grupo encerrado não pode ser editado.',
      error: 'Conflict',
    });
    expect(await groupRow(groupId)).toEqual(before);
  });

  it('responde 409 à edição que espera o encerramento terminar', async () => {
    const { groupId, cookies } = await organizerWithGroup({
      name: 'Família',
      status: 'DRAWN',
    });
    // Outra conexão encerra o grupo com a linha travada.
    const closer = new pg.Client({
      connectionString: process.env.DATABASE_URL,
    });
    await closer.connect();
    try {
      await closer.query('BEGIN');
      await closer.query('SELECT id FROM "group" WHERE id = $1 FOR UPDATE', [
        groupId,
      ]);
      await closer.query(
        `UPDATE "group" SET status = 'CLOSED', "closedAt" = now() WHERE id = $1`,
        [groupId],
      );

      const pending = updateGroup(cookies, groupId, { name: 'Outro' }).then(
        (response) => response,
      );
      await waitForLockWait();
      await closer.query('COMMIT');
      const response = await pending;

      expect(response.status).toBe(409);
      expect(response.body).toMatchObject({
        message: 'Grupo encerrado não pode ser editado.',
      });
      expect(await groupRow(groupId)).toMatchObject({
        name: 'Família',
        status: 'CLOSED',
      });
    } finally {
      await closer.end();
    }
  });

  it('responde 404 à edição de grupo excluído', async () => {
    const { groupId, cookies } = await organizerWithGroup();
    await api.dataSource.query('DELETE FROM "group" WHERE id = $1', [groupId]);

    const response = await updateGroup(cookies, groupId, { name: 'Outro' });

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({ message: 'Grupo não encontrado.' });
    expect(await groupRow(groupId)).toBeUndefined();
  });

  it('emite group.updated com os nomes dos campos que mudaram e sem dados pessoais', async () => {
    const { groupId, cookies } = await organizerWithGroup({
      name: 'Família',
      eventAt: EVENT_AT,
    });

    const events = await captureEvents(() =>
      updateGroup(cookies, groupId, {
        name: 'Grupo Rastreável',
        eventAt: EVENT_AT,
        eventLocation: 'Local Rastreável',
        description: 'Recado Rastreável',
      }).expect(200),
    );

    const updated = events.filter((record) => record.event === 'group.updated');
    expect(updated).toHaveLength(1);
    expect(updated[0]).toMatchObject({
      event: 'group.updated',
      groupId,
      fields: 'name,description,eventLocation',
    });
    const line = JSON.stringify(updated[0]);
    for (const personal of [
      'Grupo Rastreável',
      'Recado Rastreável',
      'Local Rastreável',
      'Ana Souza',
      '@exemplo.com',
    ]) {
      expect(line).not.toContain(personal);
    }
  });

  it('não emite group.updated quando nada muda nem quando a edição é recusada', async () => {
    const { groupId, cookies } = await organizerWithGroup({
      name: 'Família',
      eventAt: EVENT_AT,
    });
    const closed = await insertGroup(api.dataSource, {
      ownerId: (await groupRow(groupId)).ownerId as string,
      status: 'CLOSED',
    });
    const { id: memberId } = await insertUser(api.dataSource, 'Bia');
    await insertMembership(api.dataSource, groupId, memberId, 'APPROVED');
    const memberCookies = await openSession(api.sessions, memberId);

    const events = await captureEvents(async () => {
      await updateGroup(cookies, groupId, {
        name: 'Família',
        // O mesmo instante gravado, escrito no horário de Brasília.
        eventAt: `${NEXT_YEAR}-12-20T19:00:00-03:00`,
      }).expect(200);
      await updateGroup(cookies, groupId, { name: '' }).expect(400);
      await updateGroup(memberCookies, groupId, { name: 'Outro' }).expect(403);
      await updateGroup(cookies, closed, { name: 'Outro' }).expect(409);
    });

    expect(events.filter((record) => record.event === 'group.updated')).toEqual(
      [],
    );
  });
});

// Espera a edição ficar parada na trava da linha do grupo.
async function waitForLockWait(): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt++) {
    const [{ waiting }] = await api.dataSource.query<{ waiting: number }[]>(
      `SELECT count(*)::int AS waiting FROM pg_stat_activity
       WHERE datname = current_database() AND wait_event_type = 'Lock'`,
    );
    if (waiting > 0) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error('A edição não chegou a esperar a trava.');
}
