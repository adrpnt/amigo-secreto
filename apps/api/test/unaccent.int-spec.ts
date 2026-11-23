import pg from 'pg';
import { DataSource } from 'typeorm';
import { inject } from 'vitest';
import { EnableUnaccent1795461505511 } from '../src/database/migrations/1795461505511-EnableUnaccent.js';

const MIGRATION_DATABASE = 'unaccent_migration';

async function createEmptyDatabase(name: string): Promise<string> {
  const admin = new pg.Client({ connectionString: inject('databaseUrl') });
  await admin.connect();
  try {
    await admin.query(`DROP DATABASE IF EXISTS ${name}`);
    await admin.query(`CREATE DATABASE ${name}`);
  } finally {
    await admin.end();
  }
  const databaseUrl = new URL(inject('databaseUrl'));
  databaseUrl.pathname = `/${name}`;
  return databaseUrl.href;
}

async function hasUnaccent(dataSource: DataSource): Promise<boolean> {
  const rows = await dataSource.query<unknown[]>(
    `SELECT 1 FROM pg_extension WHERE extname = 'unaccent'`,
  );
  return rows.length === 1;
}

describe('extensão unaccent', () => {
  it("a migration habilita o unaccent e lower(unaccent('João Ávila')) vira joao avila", async () => {
    const dataSource = new DataSource({
      type: 'postgres',
      url: await createEmptyDatabase(MIGRATION_DATABASE),
      migrations: [EnableUnaccent1795461505511],
    });
    await dataSource.initialize();
    try {
      expect(await hasUnaccent(dataSource)).toBe(false);

      await dataSource.runMigrations();

      expect(await hasUnaccent(dataSource)).toBe(true);
      const [row] = await dataSource.query<{ name: string }[]>(
        `SELECT lower(unaccent('João Ávila')) AS name`,
      );
      expect(row.name).toBe('joao avila');

      await dataSource.undoLastMigration();
      expect(await hasUnaccent(dataSource)).toBe(false);
    } finally {
      await dataSource.destroy();
    }
  });
});
