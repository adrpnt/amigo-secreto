import { createHash, randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { DataSource } from 'typeorm';
import { configureApp } from '../src/app.setup.js';
import { SessionsService } from '../src/auth/sessions.service.js';
import { stubAccountEnv } from './account-env.js';
import { createSessionsFixtureModule } from './fixtures/sessions-fixture.module.js';
import { createIsolatedDatabase } from './isolated-database.js';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const THIRTY_DAYS_S = 30 * 24 * 60 * 60;

type SessionRow = {
  id: string;
  userId: string;
  tokenHash: string;
  lastUsedAt: Date;
  expiresAt: Date;
};

async function startApp(): Promise<INestApplication> {
  const app = await NestFactory.create(createSessionsFixtureModule(), {
    logger: false,
  });
  configureApp(app);
  await app.init();
  return app;
}

function sidCookie(response: request.Response): string | undefined {
  const cookies = response.headers['set-cookie'] as unknown as
    string[] | undefined;
  return cookies?.find((cookie) => cookie.startsWith('sid='));
}

function sidToken(response: request.Response): string {
  const cookie = sidCookie(response) ?? '';
  return decodeURIComponent(cookie.slice('sid='.length).split(';')[0] ?? '');
}

describe('SessionsService', () => {
  let databaseUrl: string;
  let app: INestApplication;
  let server: App;
  let dataSource: DataSource;
  let sessions: SessionsService;

  beforeAll(async () => {
    databaseUrl = await createIsolatedDatabase('sessions');
    vi.stubEnv('DATABASE_URL', databaseUrl);
    vi.stubEnv('NODE_ENV', 'test');
    app = await startApp();
    server = app.getHttpServer() as App;
    dataSource = app.get(DataSource);
    sessions = app.get(SessionsService);
  });

  afterAll(async () => {
    await app.close();
    vi.unstubAllEnvs();
  });

  async function createUser(): Promise<string> {
    const [row] = await dataSource.query<{ id: string }[]>(
      `INSERT INTO "user" (name, email, "termsVersion", "termsAcceptedAt")
       VALUES ('Ana', $1, '2026-11-19', now()) RETURNING id`,
      [`${randomUUID()}@exemplo.com`],
    );
    return row.id;
  }

  async function findSession(id: string): Promise<SessionRow> {
    const [row] = await dataSource.query<SessionRow[]>(
      'SELECT * FROM session WHERE id = $1',
      [id],
    );
    return row;
  }

  async function openSession(
    userId: string,
  ): Promise<{ sessionId: string; token: string }> {
    const response = await request(server).post(`/fixtures/sessions/${userId}`);
    return {
      sessionId: (response.body as { sessionId: string }).sessionId,
      token: sidToken(response),
    };
  }

  function current(token: string) {
    return request(server)
      .get('/fixtures/sessions/current')
      .set('Cookie', `sid=${encodeURIComponent(token)}`);
  }

  it('abre a sessão com o cookie sid HttpOnly, SameSite=Lax, Path=/ e Max-Age de 30 dias', async () => {
    const userId = await createUser();

    const response = await request(server).post(`/fixtures/sessions/${userId}`);

    const cookie = sidCookie(response);
    expect(cookie).toBeDefined();
    const attributes = cookie!.split(/;\s*/).slice(1);
    expect(attributes).toEqual(
      expect.arrayContaining([
        `Max-Age=${THIRTY_DAYS_S}`,
        'Path=/',
        'HttpOnly',
        'SameSite=Lax',
      ]),
    );
    expect(attributes).not.toContain('Secure');
    expect(Buffer.from(sidToken(response), 'base64url')).toHaveLength(32);
    const session = await findSession(
      (response.body as { sessionId: string }).sessionId,
    );
    expect(session.userId).toBe(userId);
    expect(session.expiresAt.getTime() - session.lastUsedAt.getTime()).toBe(
      30 * DAY_MS,
    );
  });

  it('marca o cookie Secure em production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('RESEND_API_KEY', 're_test');
    vi.stubEnv('EMAIL_FROM', 'Amigo Secreto <test@example.com>');
    stubAccountEnv();
    const production = await startApp();
    try {
      const userId = await createUser();

      const response = await request(production.getHttpServer() as App).post(
        `/fixtures/sessions/${userId}`,
      );

      expect(sidCookie(response)?.split(/;\s*/)).toContain('Secure');
    } finally {
      await production.close();
      vi.unstubAllEnvs();
      vi.stubEnv('DATABASE_URL', databaseUrl);
      vi.stubEnv('NODE_ENV', 'test');
    }
  });

  it('guarda só o SHA-256 do token', async () => {
    const { sessionId, token } = await openSession(await createUser());

    const session = await findSession(sessionId);

    expect(session.tokenHash).toBe(
      createHash('sha256').update(token).digest('hex'),
    );
    const [{ dump }] = await dataSource.query<{ dump: string }[]>(
      'SELECT row_to_json(session)::text AS dump FROM session WHERE id = $1',
      [sessionId],
    );
    expect(dump).not.toContain(token);
  });

  it('ignora a sessão com expiresAt no passado', async () => {
    const { sessionId, token } = await openSession(await createUser());
    await expect(sessions.resolve(token)).resolves.not.toBeNull();

    await dataSource.query(
      `UPDATE session SET "expiresAt" = now() - interval '1 second' WHERE id = $1`,
      [sessionId],
    );

    await expect(sessions.resolve(token)).resolves.toBeNull();
    expect((await current(token)).status).toBe(401);
  });

  it('grava o uso e renova expiresAt para 30 dias quando o último uso tem mais de 1 hora', async () => {
    const { sessionId, token } = await openSession(await createUser());
    await dataSource.query(
      `UPDATE session SET "lastUsedAt" = now() - interval '61 minutes',
         "expiresAt" = now() - interval '61 minutes' + interval '30 days'
       WHERE id = $1`,
      [sessionId],
    );

    const before = Date.now();
    const response = await current(token);

    expect(response.status).toBe(200);
    const session = await findSession(sessionId);
    expect(session.lastUsedAt.getTime()).toBeGreaterThanOrEqual(before - 1000);
    expect(session.expiresAt.getTime() - session.lastUsedAt.getTime()).toBe(
      30 * DAY_MS,
    );
    expect(sidCookie(response)).toContain(`Max-Age=${THIRTY_DAYS_S}`);
    expect(sidToken(response)).toBe(token);
  });

  it('não grava o uso quando o último uso tem menos de 1 hora', async () => {
    const { sessionId, token } = await openSession(await createUser());
    await dataSource.query(
      `UPDATE session SET "lastUsedAt" = now() - interval '59 minutes',
         "expiresAt" = now() - interval '59 minutes' + interval '30 days'
       WHERE id = $1`,
      [sessionId],
    );
    const before = await findSession(sessionId);

    const response = await current(token);

    expect(response.status).toBe(200);
    const after = await findSession(sessionId);
    expect(after.lastUsedAt).toEqual(before.lastUsedAt);
    expect(after.expiresAt).toEqual(before.expiresAt);
    expect(sidCookie(response)).toBeUndefined();
  });

  it('encerra todas as sessões do usuário menos a informada', async () => {
    const userId = await createUser();
    const otherUserId = await createUser();
    const kept = await openSession(userId);
    const revoked = [await openSession(userId), await openSession(userId)];
    const otherUser = await openSession(otherUserId);

    await sessions.revokeAll(userId, { except: kept.sessionId });

    expect((await current(kept.token)).status).toBe(200);
    for (const session of revoked) {
      expect((await current(session.token)).status).toBe(401);
    }
    expect((await current(otherUser.token)).status).toBe(200);
    const remaining = await dataSource.query<{ id: string }[]>(
      'SELECT id FROM session WHERE "userId" = $1',
      [userId],
    );
    expect(remaining.map((row) => row.id)).toEqual([kept.sessionId]);
  });
});
