import request from 'supertest';
import { JobRunner } from '../src/jobs/job-runner.service.js';
import {
  captureEvents,
  type Cookies,
  type GroupsApi,
  insertMembership,
  insertUser,
  openSession,
  startGroupsApi,
  stopGroupsApi,
  withSession,
} from './group-helpers.js';

const WEB_URL = 'http://localhost:3000';
const NEXT_YEAR = new Date().getUTCFullYear() + 1;
const DRAW_AT = `${NEXT_YEAR}-12-10T20:00:00.000Z`;
const EVENT_AT = `${NEXT_YEAR}-12-20T22:00:00.000Z`;
const MINUTE_MS = 60 * 1000;

type Organizer = { id: string; email: string; cookies: Cookies };

type EmailJob = {
  to: string;
  subject: string;
  blocks: Record<string, unknown>[];
};

let api: GroupsApi;

beforeAll(async () => {
  api = await startGroupsApi('draw_reminder');
});

afterAll(async () => {
  await stopGroupsApi(api);
});

beforeEach(async () => {
  await api.dataSource.query('DELETE FROM job');
});

async function organizer(name = 'Ana Souza'): Promise<Organizer> {
  const user = await insertUser(api.dataSource, name);
  return { ...user, cookies: await openSession(api.sessions, user.id) };
}

// Grupo criado pela API, que agenda o lembrete para `drawAt`.
async function createGroup(
  owner: Organizer,
  name = 'Família',
  drawAt = DRAW_AT,
): Promise<string> {
  const response = await withSession(
    request(api.server).post('/groups'),
    owner.cookies,
  ).send({ name, drawScheduledAt: drawAt, eventAt: EVENT_AT });
  expect(response.status).toBe(201);
  return (response.body as { id: string }).id;
}

function updateDrawAt(
  owner: Organizer,
  groupId: string,
  drawAt: string,
): request.Test {
  return withSession(
    request(api.server).put(`/groups/${groupId}`),
    owner.cookies,
  ).send({ name: 'Família', drawScheduledAt: drawAt, eventAt: EVENT_AT });
}

// Roda a fila no instante dado, como o agendador rodaria.
async function runAt(at: string | number): Promise<void> {
  await api.app.get(JobRunner).runRound(new Date(at));
}

function after(at: string, ms = MINUTE_MS): number {
  return new Date(at).getTime() + ms;
}

async function emailJobsTo(...emails: string[]): Promise<EmailJob[]> {
  const rows = await api.dataSource.query<{ payload: EmailJob }[]>(
    `SELECT payload FROM job
     WHERE type = 'email.send' AND payload->>'to' = ANY($1)`,
    [emails],
  );
  return rows.map((row) => row.payload);
}

async function reminderStatuses(groupId: string): Promise<string[]> {
  const rows = await api.dataSource.query<{ status: string }[]>(
    `SELECT status FROM job
     WHERE type = 'draw.reminder' AND payload->>'groupId' = $1`,
    [groupId],
  );
  return rows.map((row) => row.status);
}

function reminderEmail(to: string, groupId: string): EmailJob {
  return {
    to,
    subject: 'Chegou a hora do sorteio de Família',
    blocks: [
      {
        type: 'paragraph',
        text: 'O sorteio do amigo secreto Família estava previsto para agora. Confira quem já entrou e faça o sorteio.',
      },
      {
        type: 'button',
        label: 'Ir para o sorteio',
        url: `${WEB_URL}/grupos/${groupId}/sorteio`,
      },
    ],
  };
}

describe('lembrete de sortear', () => {
  it('na hora prevista envia a quem organiza agora o e-mail do lembrete', async () => {
    const ana = await organizer();
    const groupId = await createGroup(ana);
    const bruno = await insertUser(api.dataSource, 'Bruno Lima');
    await insertMembership(api.dataSource, groupId, bruno.id, 'APPROVED');
    const [{ id: brunoMembership }] = await api.dataSource.query<
      { id: string }[]
    >('SELECT id FROM membership WHERE "groupId" = $1 AND "userId" = $2', [
      groupId,
      bruno.id,
    ]);
    await withSession(
      request(api.server).post(`/groups/${groupId}/transfer`),
      ana.cookies,
    )
      .send({ membershipId: brunoMembership })
      .expect(200);
    // Tira da fila o aviso da transferência, que não é o lembrete.
    await api.dataSource.query(`DELETE FROM job WHERE type = 'email.send'`);

    // Antes da hora, nada sai.
    await runAt(after(DRAW_AT, -MINUTE_MS));
    expect(await emailJobsTo(ana.email, bruno.email)).toEqual([]);

    await runAt(DRAW_AT);

    expect(await emailJobsTo(ana.email, bruno.email)).toEqual([
      reminderEmail(bruno.email, groupId),
    ]);
    expect(await reminderStatuses(groupId)).toEqual(['DONE']);
  });

  it('não envia com o grupo SORTEADO ou ENCERRADO', async () => {
    const drawnOwner = await organizer();
    const drawn = await createGroup(drawnOwner);
    const closedOwner = await organizer();
    const closed = await createGroup(closedOwner);
    await api.dataSource.query(
      `UPDATE "group" SET status = 'DRAWN' WHERE id = $1`,
      [drawn],
    );
    await api.dataSource.query(
      `UPDATE "group" SET status = 'CLOSED', "closedAt" = now() WHERE id = $1`,
      [closed],
    );

    await runAt(after(DRAW_AT));

    expect(await emailJobsTo(drawnOwner.email, closedOwner.email)).toEqual([]);
    expect(await reminderStatuses(drawn)).toEqual(['DONE']);
    expect(await reminderStatuses(closed)).toEqual(['DONE']);
  });

  it('não envia se o sorteio previsto mudou depois do agendamento', async () => {
    // O lembrete antigo continua na fila: só a data do grupo muda.
    const movedOwner = await organizer();
    const moved = await createGroup(movedOwner);
    await api.dataSource.query(
      `UPDATE "group" SET "drawScheduledAt" = $2 WHERE id = $1`,
      [moved, new Date(after(DRAW_AT, 60 * MINUTE_MS))],
    );
    const removedOwner = await organizer();
    const removed = await createGroup(removedOwner);
    await api.dataSource.query(
      `UPDATE "group" SET "drawScheduledAt" = NULL WHERE id = $1`,
      [removed],
    );

    await runAt(after(DRAW_AT));

    expect(await emailJobsTo(movedOwner.email, removedOwner.email)).toEqual([]);
    expect(await reminderStatuses(moved)).toEqual(['DONE']);
    expect(await reminderStatuses(removed)).toEqual(['DONE']);
  });

  it('não envia se o grupo foi excluído', async () => {
    const owner = await organizer();
    const groupId = await createGroup(owner);
    await withSession(
      request(api.server).delete(`/groups/${groupId}`),
      owner.cookies,
    ).expect(204);

    await runAt(after(DRAW_AT));

    const reminders = await api.dataSource.query<{ subject: string }[]>(
      `SELECT payload->>'subject' AS subject FROM job
       WHERE type = 'email.send' AND payload->>'to' = $1`,
      [owner.email],
    );
    expect(reminders.map((row) => row.subject)).not.toContain(
      'Chegou a hora do sorteio de Família',
    );
    expect(await reminderStatuses(groupId)).toEqual(['DONE']);
  });

  it('mudar a data duas vezes envia um lembrete só, na data nova', async () => {
    const owner = await organizer();
    const groupId = await createGroup(owner);
    const second = new Date(after(DRAW_AT, 2 * 60 * MINUTE_MS)).toISOString();
    const third = new Date(after(DRAW_AT, 4 * 60 * MINUTE_MS)).toISOString();
    await updateDrawAt(owner, groupId, second).expect(200);
    await updateDrawAt(owner, groupId, third).expect(200);

    // Nas datas antigas, nada sai.
    await runAt(after(DRAW_AT));
    await runAt(after(second));
    expect(await emailJobsTo(owner.email)).toEqual([]);

    await runAt(third);

    expect(await emailJobsTo(owner.email)).toEqual([
      reminderEmail(owner.email, groupId),
    ]);
    expect(await reminderStatuses(groupId)).toEqual(['DONE']);
  });

  it('emite draw.reminder_sent com groupId', async () => {
    const owner = await organizer();
    const groupId = await createGroup(owner);
    const skippedOwner = await organizer();
    const skipped = await createGroup(skippedOwner);
    await api.dataSource.query(
      `UPDATE "group" SET status = 'DRAWN' WHERE id = $1`,
      [skipped],
    );

    const events = await captureEvents(() => runAt(DRAW_AT));

    const sent = events.filter(
      (record) => record.event === 'draw.reminder_sent',
    );
    expect(sent).toEqual([
      expect.objectContaining({ event: 'draw.reminder_sent', groupId }),
    ]);
    const line = JSON.stringify(sent);
    for (const personal of [
      owner.id,
      owner.email,
      'Ana Souza',
      skippedOwner.id,
      skippedOwner.email,
    ]) {
      expect(line).not.toContain(personal);
    }
  });
});
