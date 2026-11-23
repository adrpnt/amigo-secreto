import pg from 'pg';
import { inject } from 'vitest';
import { generateInviteCode } from '../src/invites/invite-code.js';

async function query<T extends pg.QueryResultRow>(
  text: string,
  values: unknown[] = [],
): Promise<T[]> {
  const client = new pg.Client({ connectionString: inject('databaseUrl') });
  await client.connect();
  try {
    return (await client.query<T>(text, values)).rows;
  } finally {
    await client.end();
  }
}

async function insertUser(email: string): Promise<string> {
  const [user] = await query<{ id: string }>(
    `INSERT INTO "user" (name, email, "termsVersion", "termsAcceptedAt")
     VALUES ('Ana', $1, '2026-11-19', now()) RETURNING id`,
    [email],
  );
  return user.id;
}

async function insertGroup(ownerId: string): Promise<string> {
  const [group] = await query<{ id: string }>(
    `INSERT INTO "group" (name, "ownerId", "inviteCode")
     VALUES ('Família', $1, $2) RETURNING id`,
    [ownerId, generateInviteCode()],
  );
  return group.id;
}

function insertMembership(groupId: string, userId: string, status: string) {
  return query(
    `INSERT INTO membership ("groupId", "userId", status) VALUES ($1, $2, $3) RETURNING id`,
    [groupId, userId, status],
  );
}

function countMemberships(groupId: string) {
  return query<{ count: string }>(
    `SELECT count(*) FROM membership WHERE "groupId" = $1`,
    [groupId],
  ).then(([row]) => Number(row.count));
}

// Cria dono, participante e grupo; apaga tudo no fim, na ordem das chaves.
async function withGroup(
  prefix: string,
  run: (ids: {
    groupId: string;
    ownerId: string;
    memberId: string;
  }) => Promise<void>,
): Promise<void> {
  const ownerId = await insertUser(`${prefix}-dono@exemplo.com`);
  const memberId = await insertUser(`${prefix}-participante@exemplo.com`);
  const groupId = await insertGroup(ownerId);
  try {
    await run({ groupId, ownerId, memberId });
  } finally {
    await query(`DELETE FROM "group" WHERE "ownerId" = $1`, [ownerId]);
    await query(`DELETE FROM membership WHERE "userId" = ANY($1)`, [
      [ownerId, memberId],
    ]);
    await query(`DELETE FROM "user" WHERE id = ANY($1)`, [[ownerId, memberId]]);
  }
}

describe('tabela membership', () => {
  it('recusa duas participações da mesma pessoa no mesmo grupo', async () => {
    await withGroup('repetida', async ({ groupId, ownerId, memberId }) => {
      await expect(
        insertMembership(groupId, memberId, 'PENDING'),
      ).resolves.toHaveLength(1);

      await expect(
        insertMembership(groupId, memberId, 'APPROVED'),
      ).rejects.toThrow(/duplicate key value violates unique constraint/);
      expect(await countMemberships(groupId)).toBe(1);

      const otherGroupId = await insertGroup(ownerId);
      await expect(
        insertMembership(otherGroupId, memberId, 'APPROVED'),
      ).resolves.toHaveLength(1);
    });
  });

  it('apaga as participações com o grupo', async () => {
    await withGroup('cascata', async ({ groupId, ownerId, memberId }) => {
      await insertMembership(groupId, ownerId, 'APPROVED');
      await insertMembership(groupId, memberId, 'PENDING');
      expect(await countMemberships(groupId)).toBe(2);

      await query(`DELETE FROM "group" WHERE id = $1`, [groupId]);

      expect(await countMemberships(groupId)).toBe(0);
    });
  });

  it('recusa status fora de PENDING, APPROVED e REJECTED', async () => {
    await withGroup('status', async ({ groupId, memberId }) => {
      for (const status of ['PENDING', 'APPROVED', 'REJECTED']) {
        const [row] = await insertMembership(groupId, memberId, status);
        await query(`DELETE FROM membership WHERE id = $1`, [
          (row as { id: string }).id,
        ]);
      }

      for (const status of ['OWNER', 'approved']) {
        await expect(
          insertMembership(groupId, memberId, status),
        ).rejects.toThrow(/violates check constraint/);
      }
      expect(await countMemberships(groupId)).toBe(0);
    });
  });

  it('impede apagar um usuário com participação', async () => {
    await withGroup('usuario', async ({ groupId, memberId }) => {
      await insertMembership(groupId, memberId, 'APPROVED');

      await expect(
        query(`DELETE FROM "user" WHERE id = $1`, [memberId]),
      ).rejects.toThrow(
        /violates RESTRICT setting of foreign key constraint .* on table "membership"/,
      );
      const users = await query(`SELECT id FROM "user" WHERE id = $1`, [
        memberId,
      ]);
      expect(users).toHaveLength(1);
    });
  });
});
