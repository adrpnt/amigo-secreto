import pg from 'pg';
import { inject } from 'vitest';
import { runMigrations } from './migrations.js';

const EMPTY_DATABASE = 'migration_run_empty';

async function hasMigrationsTable(databaseUrl: string): Promise<boolean> {
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const result = await client.query<{ table: string | null }>(
      "SELECT to_regclass('public.migrations')::text AS table",
    );
    return result.rows[0]?.table !== null;
  } finally {
    await client.end();
  }
}

describe('migration:run', () => {
  it('cria a tabela de controle de migrations num banco vazio', async () => {
    const admin = new pg.Client({ connectionString: inject('databaseUrl') });
    await admin.connect();
    await admin.query(`DROP DATABASE IF EXISTS ${EMPTY_DATABASE}`);
    await admin.query(`CREATE DATABASE ${EMPTY_DATABASE}`);
    await admin.end();
    const emptyDatabaseUrl = new URL(inject('databaseUrl'));
    emptyDatabaseUrl.pathname = `/${EMPTY_DATABASE}`;

    expect(await hasMigrationsTable(emptyDatabaseUrl.href)).toBe(false);

    await runMigrations(emptyDatabaseUrl.href);

    expect(await hasMigrationsTable(emptyDatabaseUrl.href)).toBe(true);
  });
});
