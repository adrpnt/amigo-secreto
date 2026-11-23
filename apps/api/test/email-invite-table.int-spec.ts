import { randomUUID } from 'node:crypto';
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

// Cria dono e grupo; apaga tudo no fim, na ordem das chaves.
async function withGroup(run: (groupId: string) => Promise<void>) {
  const [owner] = await query<{ id: string }>(
    `INSERT INTO "user" (name, email, "termsVersion", "termsAcceptedAt")
     VALUES ('Ana', $1, '2026-11-19', now()) RETURNING id`,
    [`${randomUUID()}@exemplo.com`],
  );
  const [group] = await query<{ id: string }>(
    `INSERT INTO "group" (name, "ownerId", "inviteCode")
     VALUES ('Família', $1, $2) RETURNING id`,
    [owner.id, generateInviteCode()],
  );
  try {
    await run(group.id);
  } finally {
    await query(`DELETE FROM "group" WHERE "ownerId" = $1`, [owner.id]);
    await query(`DELETE FROM "user" WHERE id = $1`, [owner.id]);
  }
}

function insertEmailInvite(groupId: string, email: string) {
  return query(
    `INSERT INTO email_invite ("groupId", email) VALUES ($1, $2) RETURNING id`,
    [groupId, email],
  );
}

describe('tabela email_invite', () => {
  it('grava grupo, e-mail e data do envio', async () => {
    await withGroup(async (groupId) => {
      const before = Date.now();
      await insertEmailInvite(groupId, 'bia@exemplo.com');

      const rows = await query<{
        groupId: string;
        email: string;
        createdAt: Date;
      }>(
        `SELECT "groupId", email, "createdAt" FROM email_invite WHERE "groupId" = $1`,
        [groupId],
      );
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ groupId, email: 'bia@exemplo.com' });
      expect(rows[0].createdAt.getTime()).toBeGreaterThanOrEqual(before - 1000);
      expect(rows[0].createdAt.getTime()).toBeLessThanOrEqual(
        Date.now() + 1000,
      );

      const domain = '@exemplo.com';
      await expect(
        insertEmailInvite(groupId, 'a'.repeat(254 - domain.length) + domain),
      ).resolves.toHaveLength(1);
      await expect(
        insertEmailInvite(groupId, 'a'.repeat(255 - domain.length) + domain),
      ).rejects.toThrow(/value too long/);
      await expect(
        insertEmailInvite(randomUUID(), 'bia@exemplo.com'),
      ).rejects.toThrow(/violates foreign key constraint/);

      const indexes = await query<{ indexdef: string }>(
        `SELECT indexdef FROM pg_indexes WHERE tablename = 'email_invite'`,
      );
      expect(indexes.map((index) => index.indexdef)).toContainEqual(
        expect.stringMatching(/\("groupId", "createdAt"\)$/),
      );
    });
  });

  it('apaga os envios junto com o grupo', async () => {
    await withGroup(async (groupId) => {
      await insertEmailInvite(groupId, 'bia@exemplo.com');
      await insertEmailInvite(groupId, 'caio@exemplo.com');

      await query(`DELETE FROM "group" WHERE id = $1`, [groupId]);

      const [row] = await query<{ count: string }>(
        `SELECT count(*) FROM email_invite WHERE "groupId" = $1`,
        [groupId],
      );
      expect(Number(row.count)).toBe(0);
    });
  });
});
