import { randomBytes, randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { DataSource } from 'typeorm';
import { configureApp } from '../src/app.setup.js';
import type { CookieResponse } from '../src/auth/cookies.js';
import { SessionsService } from '../src/auth/sessions.service.js';
import { createIsolatedDatabase } from './isolated-database.js';

const UNAUTHORIZED = {
  statusCode: 401,
  message: 'Entre para continuar.',
  error: 'Unauthorized',
};

const PASSWORD_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$c2FsdHNhbHRzYWx0c2FsdA$aGFzaGhhc2hoYXNoaGFzaGhhc2hoYXNoaGFzaGhhc2g';

let app: INestApplication;
let server: App;
let dataSource: DataSource;
let sessions: SessionsService;

beforeAll(async () => {
  // O ConfigModule valida o ambiente quando o módulo é importado.
  vi.stubEnv('DATABASE_URL', await createIsolatedDatabase('session_guard'));
  const { AuthFixtureModule } =
    await import('./fixtures/auth-fixture.module.js');
  app = await NestFactory.create(AuthFixtureModule, { logger: false });
  configureApp(app);
  await app.init();
  server = app.getHttpServer() as App;
  dataSource = app.get(DataSource);
  sessions = app.get(SessionsService);
});

afterAll(async () => {
  await app.close();
  vi.unstubAllEnvs();
});

async function createUser(): Promise<{ id: string; email: string }> {
  const email = `${randomUUID()}@exemplo.com`;
  const [row] = await dataSource.query<{ id: string }[]>(
    `INSERT INTO "user" (name, email, "passwordHash", "googleId", "avatarUrl",
       "emailVerifiedAt", "termsVersion", "termsAcceptedAt", "marketingOptIn")
     VALUES ('Ana Silva', $1, $2, $3, 'https://exemplo.com/ana.png', now(),
       '2026-11-19', now(), true) RETURNING id`,
    [email, PASSWORD_HASH, `google-${randomUUID()}`],
  );
  return { id: row.id, email };
}

// Abre uma sessão pelo serviço e devolve o token que iria no cookie sid.
async function openSession(
  userId: string,
): Promise<{ sessionId: string; token: string }> {
  let token = '';
  const response: CookieResponse = {
    cookie: (name, value) => {
      if (name === 'sid') token = value;
    },
    clearCookie: () => undefined,
  };
  const session = await sessions.create(userId, response);
  return { sessionId: session.id, token };
}

function withSession(path: string, token: string) {
  return request(server)
    .get(path)
    .set('Cookie', `sid=${encodeURIComponent(token)}`);
}

describe('guard de sessão', () => {
  it('responde 401 numa rota protegida sem cookie', async () => {
    const response = await request(server).get('/fixtures/auth/protected');

    expect(response.status).toBe(401);
    expect(response.body).toEqual(UNAUTHORIZED);
  });

  it('responde 401 com o cookie de uma sessão encerrada, vencida ou desconhecida', async () => {
    const user = await createUser();
    const revoked = await openSession(user.id);
    const expired = await openSession(user.id);
    await sessions.revoke(revoked.sessionId);
    await dataSource.query(
      `UPDATE session SET "expiresAt" = now() - interval '1 second' WHERE id = $1`,
      [expired.sessionId],
    );
    const unknown = randomBytes(32).toString('base64url');

    for (const token of [revoked.token, expired.token, unknown]) {
      const response = await withSession('/fixtures/auth/protected', token);

      expect(response.status).toBe(401);
      expect(response.body).toEqual(UNAUTHORIZED);
    }
  });

  it('entrega o usuário da sessão à rota por @CurrentUser', async () => {
    const user = await createUser();
    const { token } = await openSession(user.id);

    const response = await withSession('/fixtures/auth/protected', token);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: user.id,
      name: 'Ana Silva',
      email: user.email,
      avatarUrl: 'https://exemplo.com/ana.png',
      emailVerified: true,
      hasPassword: true,
      hasGoogle: true,
      marketingOptIn: true,
    });
  });

  it('deixa passar a rota com @Public sem sessão', async () => {
    const response = await request(server).get('/fixtures/auth/public');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });

  it('mantém GET /health público', async () => {
    const response = await request(server).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: 'ok' });
  });
});

describe('GET /auth/session', () => {
  it('devolve user null sem sessão', async () => {
    const response = await request(server).get('/auth/session');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ user: null, googleEnabled: false });
  });

  it('devolve o usuário da sessão sem hash de senha nem de token', async () => {
    const user = await createUser();
    const { sessionId, token } = await openSession(user.id);
    const [{ tokenHash }] = await dataSource.query<{ tokenHash: string }[]>(
      'SELECT "tokenHash" FROM session WHERE id = $1',
      [sessionId],
    );

    const response = await withSession('/auth/session', token);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      user: {
        id: user.id,
        name: 'Ana Silva',
        email: user.email,
        avatarUrl: 'https://exemplo.com/ana.png',
        emailVerified: true,
        hasPassword: true,
        hasGoogle: true,
        marketingOptIn: true,
      },
      googleEnabled: false,
    });
    for (const secret of [PASSWORD_HASH, tokenHash, token]) {
      expect(response.text).not.toContain(secret);
    }
  });
});
