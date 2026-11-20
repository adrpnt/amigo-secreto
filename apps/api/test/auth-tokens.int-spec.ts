import { createHash, randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { AuthToken } from '../src/auth/auth-token.entity.js';
import { AuthTokensService } from '../src/auth/auth-tokens.service.js';
import { databaseOptions } from '../src/database/database.options.js';
import { User } from '../src/users/user.entity.js';
import { createIsolatedDatabase } from './isolated-database.js';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

type AuthTokenRow = {
  id: string;
  userId: string;
  type: string;
  tokenHash: string;
  newEmail: string | null;
  next: string | null;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
};

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

describe('AuthTokensService', () => {
  let dataSource: DataSource;
  const tokens = new AuthTokensService();

  beforeAll(async () => {
    const databaseUrl = await createIsolatedDatabase('auth_tokens');
    dataSource = new DataSource({
      ...databaseOptions({ NODE_ENV: 'test', DATABASE_URL: databaseUrl }),
      entities: [User, AuthToken],
      migrations: [],
    });
    await dataSource.initialize();
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  async function createUser(): Promise<string> {
    const [row] = await dataSource.query<{ id: string }[]>(
      `INSERT INTO "user" (name, email, "termsVersion", "termsAcceptedAt")
       VALUES ('Ana', $1, '2026-11-19', now()) RETURNING id`,
      [`${randomUUID()}@exemplo.com`],
    );
    return row.id;
  }

  async function tokenRows(userId: string): Promise<AuthTokenRow[]> {
    return dataSource.query<AuthTokenRow[]>(
      'SELECT * FROM auth_token WHERE "userId" = $1 ORDER BY "createdAt"',
      [userId],
    );
  }

  it('guarda só o SHA-256 do token', async () => {
    const userId = await createUser();

    const raw = await dataSource.transaction((manager) =>
      tokens.issue(
        userId,
        'email_change',
        { newEmail: 'nova@exemplo.com', next: '/grupos/1' },
        manager,
      ),
    );

    const [row] = await tokenRows(userId);
    expect(row.tokenHash).toBe(sha256(raw));
    expect(row.newEmail).toBe('nova@exemplo.com');
    expect(row.next).toBe('/grupos/1');
    expect(JSON.stringify(row)).not.toContain(raw);
  });

  it('invalida o token não usado do mesmo tipo ao emitir outro', async () => {
    const userId = await createUser();
    const first = await dataSource.transaction((manager) =>
      tokens.issue(userId, 'email_verification', {}, manager),
    );
    const otherType = await dataSource.transaction((manager) =>
      tokens.issue(userId, 'password_reset', {}, manager),
    );

    const second = await dataSource.transaction((manager) =>
      tokens.issue(userId, 'email_verification', {}, manager),
    );

    expect(
      await dataSource.transaction((manager) =>
        tokens.consume(first, 'email_verification', manager),
      ),
    ).toBeNull();
    expect(
      await dataSource.transaction((manager) =>
        tokens.consume(second, 'email_verification', manager),
      ),
    ).toMatchObject({ userId, type: 'email_verification' });
    expect(
      await dataSource.transaction((manager) =>
        tokens.consume(otherType, 'password_reset', manager),
      ),
    ).toMatchObject({ userId, type: 'password_reset' });
  });

  it('consome o token uma vez só', async () => {
    const userId = await createUser();
    const raw = await dataSource.transaction((manager) =>
      tokens.issue(userId, 'password_reset', { next: '/perfil' }, manager),
    );

    const first = await dataSource.transaction((manager) =>
      tokens.consume(raw, 'password_reset', manager),
    );
    const second = await dataSource.transaction((manager) =>
      tokens.consume(raw, 'password_reset', manager),
    );

    expect(first).toMatchObject({
      userId,
      type: 'password_reset',
      next: '/perfil',
    });
    expect(first?.usedAt).toBeInstanceOf(Date);
    expect(second).toBeNull();
    const [row] = await tokenRows(userId);
    expect(row.usedAt).toBeInstanceOf(Date);
  });

  it('recusa o token vencido', async () => {
    const userId = await createUser();
    const raw = await dataSource.transaction((manager) =>
      tokens.issue(userId, 'email_verification', {}, manager),
    );
    await dataSource.query(
      `UPDATE auth_token SET "expiresAt" = now() - interval '1 second' WHERE "userId" = $1`,
      [userId],
    );

    const consumed = await dataSource.transaction((manager) =>
      tokens.consume(raw, 'email_verification', manager),
    );

    expect(consumed).toBeNull();
    const [row] = await tokenRows(userId);
    expect(row.usedAt).toBeNull();
  });

  it('recusa o token de outro tipo', async () => {
    const userId = await createUser();
    const raw = await dataSource.transaction((manager) =>
      tokens.issue(userId, 'email_verification', {}, manager),
    );

    const wrongType = await dataSource.transaction((manager) =>
      tokens.consume(raw, 'password_reset', manager),
    );

    expect(wrongType).toBeNull();
    const [row] = await tokenRows(userId);
    expect(row.usedAt).toBeNull();
    expect(
      await dataSource.transaction((manager) =>
        tokens.consume(raw, 'email_verification', manager),
      ),
    ).toMatchObject({ userId, type: 'email_verification' });
  });

  it('vence em 7 dias a confirmação, em 1 hora a recuperação e em 7 dias a troca de e-mail', async () => {
    const userId = await createUser();
    const before = Date.now();

    await dataSource.transaction(async (manager) => {
      await tokens.issue(userId, 'email_verification', {}, manager);
      await tokens.issue(userId, 'password_reset', {}, manager);
      await tokens.issue(
        userId,
        'email_change',
        { newEmail: 'nova@exemplo.com' },
        manager,
      );
    });
    const after = Date.now();

    const validity = Object.fromEntries(
      (await tokenRows(userId)).map((row) => [row.type, row.expiresAt]),
    );
    const expectations: [string, number][] = [
      ['email_verification', 7 * DAY_MS],
      ['password_reset', HOUR_MS],
      ['email_change', 7 * DAY_MS],
    ];
    for (const [type, ttl] of expectations) {
      const expiresAt = validity[type].getTime();
      expect(expiresAt).toBeGreaterThanOrEqual(before + ttl);
      expect(expiresAt).toBeLessThanOrEqual(after + ttl);
    }
  });

  it('consome o mesmo token uma vez só com duas transações simultâneas', async () => {
    const userId = await createUser();
    const raw = await dataSource.transaction((manager) =>
      tokens.issue(userId, 'password_reset', {}, manager),
    );
    const first = dataSource.createQueryRunner();
    const second = dataSource.createQueryRunner();
    await first.connect();
    await second.connect();
    try {
      await first.startTransaction();
      await second.startTransaction();
      const firstResult = await tokens.consume(
        raw,
        'password_reset',
        first.manager,
      );
      const secondResult = tokens.consume(
        raw,
        'password_reset',
        second.manager,
      );
      // A segunda transação tem de estar esperando a linha travada pela
      // primeira antes de a primeira terminar.
      await vi.waitFor(
        async () => {
          const [row] = await dataSource.query<{ waiting: number }[]>(
            `SELECT count(*)::int AS waiting FROM pg_stat_activity
             WHERE datname = current_database() AND wait_event_type = 'Lock'`,
          );
          expect(row?.waiting).toBe(1);
        },
        { timeout: 10_000, interval: 20 },
      );
      await first.commitTransaction();
      const secondConsumed = await secondResult;
      await second.commitTransaction();

      expect(firstResult).toMatchObject({ userId, type: 'password_reset' });
      expect(secondConsumed).toBeNull();
    } finally {
      await first.release();
      await second.release();
    }
  });
});
