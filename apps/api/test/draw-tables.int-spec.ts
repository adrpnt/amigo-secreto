import { DataSource } from 'typeorm';
import { inject } from 'vitest';
import {
  insertDraw,
  insertExclusion,
  insertGroup,
  insertMembership,
  insertUser,
} from './group-helpers.js';

const CHECK_VIOLATION = /violates check constraint/;
const UNIQUE_VIOLATION = /duplicate key value violates unique constraint/;

let dataSource: DataSource;

beforeAll(async () => {
  dataSource = new DataSource({ type: 'postgres', url: inject('databaseUrl') });
  await dataSource.initialize();
});

afterAll(async () => {
  await dataSource.destroy();
});

type Group = { groupId: string; people: [string, string, string, string] };

// Grupo com quem organiza e mais três aprovados; apaga tudo no fim, na ordem
// das chaves.
async function withGroup(run: (group: Group) => Promise<void>): Promise<void> {
  const users = await Promise.all(
    ['Ana Souza', 'Bruno Lima', 'Carla Dias', 'Davi Melo'].map((name) =>
      insertUser(dataSource, name),
    ),
  );
  const ids = users.map((user) => user.id) as Group['people'];
  const groupId = await insertGroup(dataSource, { ownerId: ids[0] });
  for (const id of ids.slice(1)) {
    await insertMembership(dataSource, groupId, id, 'APPROVED');
  }
  try {
    await run({ groupId, people: ids });
  } finally {
    await dataSource.query(`DELETE FROM "group" WHERE "ownerId" = $1`, [
      ids[0],
    ]);
    await dataSource.query(`DELETE FROM "user" WHERE id = ANY($1)`, [ids]);
  }
}

function insertRawExclusion(groupId: string, userAId: string, userBId: string) {
  return dataSource.query(
    `INSERT INTO exclusion ("groupId", "userAId", "userBId") VALUES ($1, $2, $3)`,
    [groupId, userAId, userBId],
  );
}

function insertRawDraw(
  groupId: string,
  status: string,
  cancelledAt: Date | null,
) {
  return dataSource.query(
    `INSERT INTO draw ("groupId", status, "singleCycle", "cancelledAt")
     VALUES ($1, $2, true, $3)`,
    [groupId, status, cancelledAt],
  );
}

function insertAssignment(drawId: string, giver: string, receiver: string) {
  return dataSource.query(
    `INSERT INTO assignment ("drawId", "giverUserId", "receiverUserId")
     VALUES ($1, $2, $3)`,
    [drawId, giver, receiver],
  );
}

async function count(table: string, column: string, value: string) {
  const [row] = await dataSource.query<{ count: string }[]>(
    `SELECT count(*) FROM ${table} WHERE "${column}" = $1`,
    [value],
  );
  return Number(row.count);
}

describe('tabelas do sorteio', () => {
  it('são criadas pela migration com as colunas do design', async () => {
    const columns = await dataSource.query<
      {
        table_name: string;
        column_name: string;
        data_type: string;
        is_nullable: string;
        character_maximum_length: number | null;
      }[]
    >(
      `SELECT table_name, column_name, data_type, is_nullable, character_maximum_length
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name IN ('exclusion', 'draw', 'assignment')`,
    );
    const shape = (table: string) =>
      Object.fromEntries(
        columns
          .filter((c) => c.table_name === table)
          .map((c) => [
            c.column_name,
            [c.data_type, c.is_nullable, c.character_maximum_length],
          ]),
      );
    const timestamp = 'timestamp with time zone';

    expect(shape('exclusion')).toEqual({
      id: ['uuid', 'NO', null],
      groupId: ['uuid', 'NO', null],
      userAId: ['uuid', 'NO', null],
      userBId: ['uuid', 'NO', null],
      createdAt: [timestamp, 'NO', null],
    });
    expect(shape('draw')).toEqual({
      id: ['uuid', 'NO', null],
      groupId: ['uuid', 'NO', null],
      status: ['character varying', 'NO', 10],
      singleCycle: ['boolean', 'NO', null],
      createdAt: [timestamp, 'NO', null],
      cancelledAt: [timestamp, 'YES', null],
    });
    expect(shape('assignment')).toEqual({
      id: ['uuid', 'NO', null],
      drawId: ['uuid', 'NO', null],
      giverUserId: ['uuid', 'NO', null],
      receiverUserId: ['uuid', 'NO', null],
    });

    const foreignKeys = await dataSource.query<
      { table: string; column: string; target: string; on_delete: string }[]
    >(
      `SELECT kcu.table_name AS table, kcu.column_name AS column,
         ccu.table_name AS target, rc.delete_rule AS on_delete
       FROM information_schema.referential_constraints rc
       JOIN information_schema.key_column_usage kcu
         ON kcu.constraint_name = rc.constraint_name
       JOIN information_schema.constraint_column_usage ccu
         ON ccu.constraint_name = rc.unique_constraint_name
       WHERE kcu.table_name IN ('exclusion', 'draw', 'assignment')
       ORDER BY kcu.table_name, kcu.column_name`,
    );
    expect(foreignKeys).toEqual([
      {
        table: 'assignment',
        column: 'drawId',
        target: 'draw',
        on_delete: 'CASCADE',
      },
      {
        table: 'assignment',
        column: 'giverUserId',
        target: 'user',
        on_delete: 'RESTRICT',
      },
      {
        table: 'assignment',
        column: 'receiverUserId',
        target: 'user',
        on_delete: 'RESTRICT',
      },
      {
        table: 'draw',
        column: 'groupId',
        target: 'group',
        on_delete: 'CASCADE',
      },
      {
        table: 'exclusion',
        column: 'groupId',
        target: 'group',
        on_delete: 'CASCADE',
      },
      {
        table: 'exclusion',
        column: 'userAId',
        target: 'user',
        on_delete: 'RESTRICT',
      },
      {
        table: 'exclusion',
        column: 'userBId',
        target: 'user',
        on_delete: 'RESTRICT',
      },
    ]);

    const indexes = await dataSource.query<{ indexdef: string }[]>(
      `SELECT indexdef FROM pg_indexes WHERE tablename = 'draw'`,
    );
    expect(indexes.map((index) => index.indexdef)).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/\("groupId", "createdAt"\)$/),
        expect.stringMatching(
          /^CREATE UNIQUE INDEX .* \("groupId"\) WHERE \(\(status\)::text = 'ACTIVE'::text\)$/,
        ),
      ]),
    );
  });

  it('o banco recusa par de restrição repetido ou fora de ordem', async () => {
    await withGroup(async ({ groupId, people: [ana, bruno, carla] }) => {
      const [low, high] = [ana, bruno].sort();
      await expect(
        insertRawExclusion(groupId, low, high),
      ).resolves.toBeDefined();
      await expect(
        insertExclusion(dataSource, groupId, carla, ana),
      ).resolves.toEqual(expect.any(String));

      await expect(insertRawExclusion(groupId, low, high)).rejects.toThrow(
        UNIQUE_VIOLATION,
      );
      await expect(insertRawExclusion(groupId, high, low)).rejects.toThrow(
        CHECK_VIOLATION,
      );
      await expect(insertRawExclusion(groupId, ana, ana)).rejects.toThrow(
        CHECK_VIOLATION,
      );
      expect(await count('exclusion', 'groupId', groupId)).toBe(2);
    });
  });

  it('o banco recusa segunda rodada ativa no mesmo grupo', async () => {
    await withGroup(async ({ groupId, people: [ana] }) => {
      await insertDraw(dataSource, groupId);
      await expect(insertRawDraw(groupId, 'ACTIVE', null)).rejects.toThrow(
        UNIQUE_VIOLATION,
      );

      // Rodadas canceladas convivem com a ativa.
      await insertDraw(dataSource, groupId, { status: 'CANCELLED' });
      await insertDraw(dataSource, groupId, { status: 'CANCELLED' });
      expect(await count('draw', 'groupId', groupId)).toBe(3);

      await expect(insertRawDraw(groupId, 'CANCELLED', null)).rejects.toThrow(
        CHECK_VIOLATION,
      );
      await expect(
        insertRawDraw(groupId, 'ACTIVE', new Date()),
      ).rejects.toThrow(CHECK_VIOLATION);
      await expect(insertRawDraw(groupId, 'DONE', null)).rejects.toThrow(
        CHECK_VIOLATION,
      );

      // Outro grupo tem a própria rodada ativa.
      const otherGroupId = await insertGroup(dataSource, { ownerId: ana });
      await expect(insertDraw(dataSource, otherGroupId)).resolves.toEqual(
        expect.any(String),
      );
    });
  });

  it('o banco recusa pessoa que tira a si mesma ou que tira ou é tirada duas vezes na rodada', async () => {
    await withGroup(async ({ groupId, people: [ana, bruno, carla, davi] }) => {
      const drawId = await insertDraw(dataSource, groupId, {
        assignments: [
          [ana, bruno],
          [bruno, carla],
        ],
      });

      await expect(insertAssignment(drawId, davi, davi)).rejects.toThrow(
        CHECK_VIOLATION,
      );
      await expect(insertAssignment(drawId, ana, davi)).rejects.toThrow(
        UNIQUE_VIOLATION,
      );
      await expect(insertAssignment(drawId, davi, bruno)).rejects.toThrow(
        UNIQUE_VIOLATION,
      );
      expect(await count('assignment', 'drawId', drawId)).toBe(2);

      // Em outra rodada, as mesmas pessoas tiram de novo.
      const cancelledId = await insertDraw(dataSource, groupId, {
        status: 'CANCELLED',
        assignments: [[ana, bruno]],
      });
      expect(await count('assignment', 'drawId', cancelledId)).toBe(1);
    });
  });

  it('excluir o grupo apaga pares de restrição, rodadas e pares sorteados', async () => {
    await withGroup(async ({ groupId, people: [ana, bruno, carla, davi] }) => {
      await insertExclusion(dataSource, groupId, ana, bruno);
      const activeId = await insertDraw(dataSource, groupId, {
        assignments: [
          [ana, carla],
          [carla, bruno],
          [bruno, davi],
          [davi, ana],
        ],
      });
      const cancelledId = await insertDraw(dataSource, groupId, {
        status: 'CANCELLED',
        assignments: [[ana, davi]],
      });

      await dataSource.query(`DELETE FROM "group" WHERE id = $1`, [groupId]);

      expect(await count('exclusion', 'groupId', groupId)).toBe(0);
      expect(await count('draw', 'groupId', groupId)).toBe(0);
      expect(await count('assignment', 'drawId', activeId)).toBe(0);
      expect(await count('assignment', 'drawId', cancelledId)).toBe(0);
    });
  });
});
