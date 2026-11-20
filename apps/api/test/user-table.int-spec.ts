import pg from 'pg';
import { DataSource } from 'typeorm';
import { inject } from 'vitest';
import { CreateUserTable1795180059667 } from '../src/database/migrations/1795180059667-CreateUserTable.js';

const REVERT_DATABASE = 'user_table_revert';

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

async function hasUserTable(databaseUrl: string): Promise<boolean> {
  const rows = await query<{ table: string | null }>(
    databaseUrl,
    "SELECT to_regclass('public.user')::text AS table",
  );
  return rows[0]?.table !== null;
}

function insertUser(email: string, googleId: string | null = null) {
  return query(
    inject('databaseUrl'),
    `INSERT INTO "user" (name, email, "googleId", "termsVersion", "termsAcceptedAt")
     VALUES ('Ana', $1, $2, '2026-11-19', now()) RETURNING id`,
    [email, googleId],
  );
}

async function deleteUsers(emails: string[]): Promise<void> {
  await query(
    inject('databaseUrl'),
    `DELETE FROM "user" WHERE email = ANY($1)`,
    [emails],
  );
}

describe('tabela user', () => {
  it('é criada pela migration com as colunas da conta', async () => {
    const columns = await query<{
      column_name: string;
      data_type: string;
      is_nullable: string;
    }>(
      inject('databaseUrl'),
      `SELECT column_name, data_type, is_nullable FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'user'`,
    );

    expect(
      Object.fromEntries(
        columns.map((c) => [c.column_name, [c.data_type, c.is_nullable]]),
      ),
    ).toEqual({
      id: ['uuid', 'NO'],
      name: ['character varying', 'NO'],
      email: ['character varying', 'NO'],
      passwordHash: ['character varying', 'YES'],
      googleId: ['character varying', 'YES'],
      avatarUrl: ['character varying', 'YES'],
      emailVerifiedAt: ['timestamp with time zone', 'YES'],
      termsVersion: ['character varying', 'NO'],
      termsAcceptedAt: ['timestamp with time zone', 'NO'],
      marketingOptIn: ['boolean', 'NO'],
      marketingOptInAt: ['timestamp with time zone', 'YES'],
      createdAt: ['timestamp with time zone', 'NO'],
      updatedAt: ['timestamp with time zone', 'NO'],
    });
    const lengths = await query<{
      column_name: string;
      character_maximum_length: number;
    }>(
      inject('databaseUrl'),
      `SELECT column_name, character_maximum_length FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'user'
         AND column_name IN ('name', 'email', 'googleId')`,
    );
    expect(
      Object.fromEntries(
        lengths.map((c) => [c.column_name, c.character_maximum_length]),
      ),
    ).toEqual({ name: 80, email: 254, googleId: 255 });
  });

  it('recusa dois e-mails iguais', async () => {
    const email = 'repetido@exemplo.com';
    try {
      await expect(insertUser(email)).resolves.toHaveLength(1);

      await expect(insertUser(email)).rejects.toThrow(
        /duplicate key value violates unique constraint/,
      );
    } finally {
      await deleteUsers([email]);
    }
  });

  it('recusa dois googleId iguais', async () => {
    const emails = ['google-1@exemplo.com', 'google-2@exemplo.com'];
    try {
      await expect(insertUser(emails[0], 'google-sub-1')).resolves.toHaveLength(
        1,
      );

      await expect(insertUser(emails[1], 'google-sub-1')).rejects.toThrow(
        /duplicate key value violates unique constraint/,
      );
    } finally {
      await deleteUsers(emails);
    }
  });

  it('é removida ao reverter a migration', async () => {
    const databaseUrl = await createEmptyDatabase(REVERT_DATABASE);
    const dataSource = new DataSource({
      type: 'postgres',
      url: databaseUrl,
      migrations: [CreateUserTable1795180059667],
    });
    await dataSource.initialize();
    try {
      await dataSource.runMigrations();
      expect(await hasUserTable(databaseUrl)).toBe(true);

      await dataSource.undoLastMigration();

      expect(await hasUserTable(databaseUrl)).toBe(false);
    } finally {
      await dataSource.destroy();
    }
  });
});
