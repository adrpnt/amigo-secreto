import { DataSource } from 'typeorm';
import { ScheduleExistingDrawReminders1795730775303 } from '../src/database/migrations/1795730775303-ScheduleExistingDrawReminders.js';
import { insertGroup, insertUser } from './group-helpers.js';
import { createIsolatedDatabase } from './isolated-database.js';
import { runMigrations } from './migrations.js';

const HOUR_MS = 60 * 60 * 1000;
const MIGRATION = new ScheduleExistingDrawReminders1795730775303().name;

type ReminderRow = {
  status: string;
  runAt: Date;
  attempts: number;
  payload: Record<string, unknown>;
};

describe('lembretes de grupos existentes', () => {
  let databaseUrl: string;
  let dataSource: DataSource;

  beforeAll(async () => {
    databaseUrl = await createIsolatedDatabase('draw_reminder_backfill');
    dataSource = new DataSource({ type: 'postgres', url: databaseUrl });
    await dataSource.initialize();
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  it('a migration agenda o lembrete dos grupos ABERTOS com sorteio previsto no futuro e só deles', async () => {
    const owner = await insertUser(dataSource);
    const future = new Date(Date.now() + 48 * HOUR_MS);
    future.setUTCMilliseconds(250);
    const past = new Date(Date.now() - HOUR_MS).toISOString();
    const scheduled = await insertGroup(dataSource, {
      ownerId: owner.id,
      drawScheduledAt: future.toISOString(),
    });
    // Nenhum destes ganha lembrete.
    const skipped = [
      await insertGroup(dataSource, { ownerId: owner.id }),
      await insertGroup(dataSource, {
        ownerId: owner.id,
        drawScheduledAt: past,
      }),
      await insertGroup(dataSource, {
        ownerId: owner.id,
        status: 'DRAWN',
        drawScheduledAt: future.toISOString(),
      }),
      await insertGroup(dataSource, {
        ownerId: owner.id,
        status: 'CLOSED',
        drawScheduledAt: future.toISOString(),
      }),
    ];
    // O banco de testes já vem migrado: a migration roda de novo, agora com
    // grupos criados antes dela.
    await dataSource.query('DELETE FROM migrations WHERE name = $1', [
      MIGRATION,
    ]);

    await runMigrations(databaseUrl);

    const reminders = await dataSource.query<
      (ReminderRow & { groupId: string })[]
    >(
      `SELECT payload->>'groupId' AS "groupId", status, "runAt", attempts, payload
       FROM job WHERE type = 'draw.reminder'`,
    );
    expect(reminders).toEqual([
      {
        groupId: scheduled,
        status: 'PENDING',
        runAt: future,
        attempts: 0,
        payload: { groupId: scheduled, drawScheduledAt: future.toISOString() },
      },
    ]);
    for (const groupId of skipped) {
      expect(reminders.map((row) => row.groupId)).not.toContain(groupId);
    }
  });
});
