import pg from 'pg';
import { DataSource } from 'typeorm';
import { inject } from 'vitest';
import { CreateJobTable1795027980580 } from '../src/database/migrations/1795027980580-CreateJobTable.js';

const REVERT_DATABASE = 'job_table_revert';

async function query<T extends pg.QueryResultRow>(
  databaseUrl: string,
  text: string,
  values: unknown[] = [],
): Promise<T[]> {
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    return (await client.query<T>(text, values)).rows;
  } finally {
    await client.end();
  }
}

async function createEmptyDatabase(name: string): Promise<string> {
  await query(inject('databaseUrl'), `DROP DATABASE IF EXISTS ${name}`);
  await query(inject('databaseUrl'), `CREATE DATABASE ${name}`);
  const databaseUrl = new URL(inject('databaseUrl'));
  databaseUrl.pathname = `/${name}`;
  return databaseUrl.href;
}

async function hasJobTable(databaseUrl: string): Promise<boolean> {
  const rows = await query<{ table: string | null }>(
    databaseUrl,
    "SELECT to_regclass('public.job')::text AS table",
  );
  return rows[0]?.table !== null;
}

describe('tabela job', () => {
  it('é criada pela migration com as colunas id, type, payload, runAt, status, attempts, lastError, lockedAt e createdAt', async () => {
    const columns = await query<{ column_name: string; data_type: string }>(
      inject('databaseUrl'),
      `SELECT column_name, data_type FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'job'`,
    );

    expect(
      Object.fromEntries(columns.map((c) => [c.column_name, c.data_type])),
    ).toEqual({
      id: 'uuid',
      type: 'character varying',
      payload: 'jsonb',
      runAt: 'timestamp with time zone',
      status: 'USER-DEFINED',
      attempts: 'integer',
      lastError: 'character varying',
      lockedAt: 'timestamp with time zone',
      createdAt: 'timestamp with time zone',
    });
    const [id] = await query<{ column_default: string }>(
      inject('databaseUrl'),
      `SELECT column_default FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'job' AND column_name = 'id'`,
    );
    expect(id?.column_default).toBe('gen_random_uuid()');
  });

  it('recusa um status fora de PENDING, RUNNING, DONE e FAILED', async () => {
    const insert = (status: string) =>
      query(
        inject('databaseUrl'),
        `INSERT INTO job (type, payload, "runAt", status)
         VALUES ('job-table.status', '{}', now(), $1) RETURNING id`,
        [status],
      );

    try {
      for (const status of ['PENDING', 'RUNNING', 'DONE', 'FAILED']) {
        await expect(insert(status)).resolves.toHaveLength(1);
      }
      for (const status of ['CANCELED', 'pending', '']) {
        await expect(insert(status)).rejects.toThrow(
          /invalid input value for enum/,
        );
      }
    } finally {
      await query(
        inject('databaseUrl'),
        "DELETE FROM job WHERE type = 'job-table.status'",
      );
    }
  });

  it('tem um índice por status e runAt', async () => {
    const indexes = await query<{ indexdef: string }>(
      inject('databaseUrl'),
      "SELECT indexdef FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'job'",
    );

    expect(indexes.map((i) => i.indexdef)).toContainEqual(
      expect.stringMatching(/\(status, "runAt"\)$/),
    );
  });

  it('é removida ao reverter a migration', async () => {
    const databaseUrl = await createEmptyDatabase(REVERT_DATABASE);
    const dataSource = new DataSource({
      type: 'postgres',
      url: databaseUrl,
      migrations: [CreateJobTable1795027980580],
    });
    await dataSource.initialize();
    try {
      await dataSource.runMigrations();
      expect(await hasJobTable(databaseUrl)).toBe(true);

      await dataSource.undoLastMigration();

      expect(await hasJobTable(databaseUrl)).toBe(false);
      const enumTypes = await query(
        databaseUrl,
        "SELECT 1 FROM pg_type WHERE typname = 'job_status_enum'",
      );
      expect(enumTypes).toHaveLength(0);
    } finally {
      await dataSource.destroy();
    }
  });
});
