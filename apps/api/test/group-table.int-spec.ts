import pg from 'pg';
import { DataSource } from 'typeorm';
import { inject } from 'vitest';
import { CreateGroupTable1795290372036 } from '../src/database/migrations/1795290372036-CreateGroupTable.js';
import { CreateUserTable1795180059667 } from '../src/database/migrations/1795180059667-CreateUserTable.js';
import { generateInviteCode } from '../src/invites/invite-code.js';

const REVERT_DATABASE = 'group_table_revert';
const CHECK_VIOLATION = /violates check constraint/;

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

async function hasTable(databaseUrl: string, table: string): Promise<boolean> {
  const rows = await query<{ table: string | null }>(
    databaseUrl,
    `SELECT to_regclass('public.${table}')::text AS table`,
  );
  return rows[0]?.table !== null;
}

type GroupRow = {
  giftMinValue?: number | null;
  giftMaxValue?: number | null;
  status?: string;
  closedAt?: Date | null;
};

// Cada teste usa um dono próprio e apaga os grupos e o dono no fim.
async function withOwner(
  email: string,
  run: (insertGroup: (row?: GroupRow) => Promise<unknown>) => Promise<void>,
): Promise<void> {
  const databaseUrl = inject('databaseUrl');
  const [owner] = await query<{ id: string }>(
    databaseUrl,
    `INSERT INTO "user" (name, email, "termsVersion", "termsAcceptedAt")
     VALUES ('Ana', $1, '2026-11-19', now()) RETURNING id`,
    [email],
  );
  const insertGroup = (row: GroupRow = {}) =>
    query(
      databaseUrl,
      `INSERT INTO "group" (name, "ownerId", "giftMinValue", "giftMaxValue", status, "closedAt", "inviteCode")
       VALUES ('Família', $1, $2, $3, $4, $5, $6) RETURNING id`,
      [
        owner.id,
        row.giftMinValue ?? null,
        row.giftMaxValue ?? null,
        row.status ?? 'OPEN',
        row.closedAt ?? null,
        generateInviteCode(),
      ],
    );
  try {
    await run(insertGroup);
  } finally {
    await query(databaseUrl, `DELETE FROM "group" WHERE "ownerId" = $1`, [
      owner.id,
    ]);
    await query(databaseUrl, `DELETE FROM "user" WHERE id = $1`, [owner.id]);
  }
}

describe('tabela group', () => {
  it('é criada pela migration com as colunas do grupo', async () => {
    const columns = await query<{
      column_name: string;
      data_type: string;
      is_nullable: string;
      character_maximum_length: number | null;
      column_default: string | null;
    }>(
      inject('databaseUrl'),
      `SELECT column_name, data_type, is_nullable, character_maximum_length, column_default
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'group'`,
    );

    expect(
      Object.fromEntries(
        columns.map((c) => [
          c.column_name,
          [c.data_type, c.is_nullable, c.character_maximum_length],
        ]),
      ),
    ).toEqual({
      id: ['uuid', 'NO', null],
      name: ['character varying', 'NO', 80],
      description: ['character varying', 'YES', 1000],
      ownerId: ['uuid', 'NO', null],
      giftMinValue: ['integer', 'YES', null],
      giftMaxValue: ['integer', 'YES', null],
      drawScheduledAt: ['timestamp with time zone', 'YES', null],
      eventAt: ['timestamp with time zone', 'YES', null],
      eventLocation: ['character varying', 'YES', 200],
      isOnlineEvent: ['boolean', 'NO', null],
      requiresApproval: ['boolean', 'NO', null],
      status: ['character varying', 'NO', 10],
      inviteCode: ['character varying', 'NO', 10],
      closedAt: ['timestamp with time zone', 'YES', null],
      createdAt: ['timestamp with time zone', 'NO', null],
      updatedAt: ['timestamp with time zone', 'NO', null],
    });
    const defaults = Object.fromEntries(
      columns.map((c) => [c.column_name, c.column_default]),
    );
    expect(defaults.status).toBe("'OPEN'::character varying");
    expect(defaults.isOnlineEvent).toBe('false');
    expect(defaults.requiresApproval).toBe('false');

    const foreignKeys = await query<{ column: string; on_delete: string }>(
      inject('databaseUrl'),
      `SELECT kcu.column_name AS column, rc.delete_rule AS on_delete
       FROM information_schema.referential_constraints rc
       JOIN information_schema.key_column_usage kcu
         ON kcu.constraint_name = rc.constraint_name
       WHERE kcu.table_name = 'group'`,
    );
    expect(foreignKeys).toEqual([{ column: 'ownerId', on_delete: 'RESTRICT' }]);

    const indexes = await query<{ indexdef: string }>(
      inject('databaseUrl'),
      `SELECT indexdef FROM pg_indexes WHERE tablename = 'group'`,
    );
    expect(indexes.map((i) => i.indexdef)).toContainEqual(
      expect.stringMatching(/\("ownerId"\)$/),
    );
  });

  it('recusa mínimo maior que máximo e só um dos valores', async () => {
    await withOwner('grupo-valores@exemplo.com', async (insertGroup) => {
      await expect(
        insertGroup({ giftMinValue: 50, giftMaxValue: 50 }),
      ).resolves.toHaveLength(1);
      await expect(
        insertGroup({ giftMinValue: 50, giftMaxValue: 100 }),
      ).resolves.toHaveLength(1);
      await expect(insertGroup()).resolves.toHaveLength(1);

      await expect(
        insertGroup({ giftMinValue: 101, giftMaxValue: 100 }),
      ).rejects.toThrow(CHECK_VIOLATION);
      await expect(insertGroup({ giftMinValue: 50 })).rejects.toThrow(
        CHECK_VIOLATION,
      );
      await expect(insertGroup({ giftMaxValue: 50 })).rejects.toThrow(
        CHECK_VIOLATION,
      );
    });
  });

  it('recusa status fora de OPEN, DRAWN e CLOSED', async () => {
    await withOwner('grupo-status@exemplo.com', async (insertGroup) => {
      await expect(insertGroup({ status: 'OPEN' })).resolves.toHaveLength(1);
      await expect(insertGroup({ status: 'DRAWN' })).resolves.toHaveLength(1);
      await expect(
        insertGroup({ status: 'CLOSED', closedAt: new Date() }),
      ).resolves.toHaveLength(1);

      await expect(insertGroup({ status: 'ARCHIVED' })).rejects.toThrow(
        CHECK_VIOLATION,
      );
      await expect(insertGroup({ status: 'open' })).rejects.toThrow(
        CHECK_VIOLATION,
      );
    });
  });

  it('exige closedAt só no status CLOSED', async () => {
    await withOwner('grupo-encerrado@exemplo.com', async (insertGroup) => {
      await expect(insertGroup({ status: 'CLOSED' })).rejects.toThrow(
        CHECK_VIOLATION,
      );
      await expect(
        insertGroup({ status: 'OPEN', closedAt: new Date() }),
      ).rejects.toThrow(CHECK_VIOLATION);
      await expect(
        insertGroup({ status: 'DRAWN', closedAt: new Date() }),
      ).rejects.toThrow(CHECK_VIOLATION);

      await expect(
        insertGroup({ status: 'CLOSED', closedAt: new Date() }),
      ).resolves.toHaveLength(1);
    });
  });

  it('é removida ao reverter a migration', async () => {
    const databaseUrl = await createEmptyDatabase(REVERT_DATABASE);
    const dataSource = new DataSource({
      type: 'postgres',
      url: databaseUrl,
      migrations: [CreateUserTable1795180059667, CreateGroupTable1795290372036],
    });
    await dataSource.initialize();
    try {
      await dataSource.runMigrations();
      expect(await hasTable(databaseUrl, 'group')).toBe(true);

      await dataSource.undoLastMigration();

      expect(await hasTable(databaseUrl, 'group')).toBe(false);
      expect(await hasTable(databaseUrl, 'user')).toBe(true);
    } finally {
      await dataSource.destroy();
    }
  });
});
