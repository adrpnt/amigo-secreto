import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import pg from 'pg';
import { inject } from 'vitest';
import { runMigrations } from './migrations.js';

const EMPTY_DATABASE = 'migration_run_empty';
const CLEAN_CLONE_DATABASE = 'migration_run_clean_clone';
const DIST_DIR = join(import.meta.dirname, '..', 'dist');

async function createEmptyDatabase(name: string): Promise<string> {
  const admin = new pg.Client({ connectionString: inject('databaseUrl') });
  await admin.connect();
  await admin.query(`DROP DATABASE IF EXISTS ${name}`);
  await admin.query(`CREATE DATABASE ${name}`);
  await admin.end();
  const databaseUrl = new URL(inject('databaseUrl'));
  databaseUrl.pathname = `/${name}`;
  return databaseUrl.href;
}

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
    const emptyDatabaseUrl = await createEmptyDatabase(EMPTY_DATABASE);

    expect(await hasMigrationsTable(emptyDatabaseUrl)).toBe(false);

    await runMigrations(emptyDatabaseUrl);

    expect(await hasMigrationsTable(emptyDatabaseUrl)).toBe(true);
  });

  it('roda num clone sem build, sem a pasta dist', async () => {
    const databaseUrl = await createEmptyDatabase(CLEAN_CLONE_DATABASE);
    await rm(DIST_DIR, { recursive: true, force: true });

    await runMigrations(databaseUrl);

    expect(await hasMigrationsTable(databaseUrl)).toBe(true);
  });
});
