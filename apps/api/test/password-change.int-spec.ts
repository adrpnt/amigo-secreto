import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { DataSource } from 'typeorm';
import { configureApp } from '../src/app.setup.js';
import type { CookieResponse } from '../src/auth/cookies.js';
import { PasswordHasher } from '../src/auth/password-hasher.js';
import { SessionsService } from '../src/auth/sessions.service.js';
import { createIsolatedDatabase } from './isolated-database.js';

const CURRENT_PASSWORD = 'senha-atual-123';
const NEW_PASSWORD = 'senha-nova-456';
const CHANGED_SUBJECT = 'Sua senha do Amigo Secreto foi alterada';
const WRONG_PASSWORD = {
  statusCode: 400,
  message: 'Senha atual incorreta.',
  error: 'Bad Request',
};

type Cookies = { sid: string; csrf: string };

let app: INestApplication;
let server: App;
let dataSource: DataSource;
let sessions: SessionsService;
const hasher = new PasswordHasher();
let currentHash: string;

beforeAll(async () => {
  // O ConfigModule valida o ambiente quando o módulo é importado.
  vi.stubEnv('DATABASE_URL', await createIsolatedDatabase('password_change'));
  const { AuthFixtureModule } =
    await import('./fixtures/auth-fixture.module.js');
  app = await NestFactory.create(AuthFixtureModule, { logger: false });
  configureApp(app);
  await app.init();
  server = app.getHttpServer() as App;
  dataSource = app.get(DataSource);
  sessions = app.get(SessionsService);
  currentHash = await hasher.hash(CURRENT_PASSWORD);
});

afterAll(async () => {
  await app.close();
  vi.unstubAllEnvs();
});

type Account = { id: string; email: string };

async function createAccount(
  options: { googleOnly?: boolean } = {},
): Promise<Account> {
  const email = `${randomUUID()}@exemplo.com`;
  const [row] = await dataSource.query<{ id: string }[]>(
    `INSERT INTO "user" (name, email, "passwordHash", "googleId", "emailVerifiedAt", "termsVersion", "termsAcceptedAt")
     VALUES ('Ana Souza', $1, $2, $3, now(), '2026-11-19', now()) RETURNING id`,
    [
      email,
      options.googleOnly ? null : currentHash,
      options.googleOnly ? `sub-${randomUUID()}` : null,
    ],
  );
  return { id: row.id, email };
}

// Abre uma sessão como o login faz: grava sid e um csrf da sessão nova.
async function openSession(userId: string): Promise<Cookies> {
  const cookies: Partial<Cookies> = {};
  const response: CookieResponse = {
    cookie: (name, value) => {
      if (name === 'sid' || name === 'csrf') cookies[name] = value;
    },
    clearCookie: () => undefined,
  };
  await sessions.create(userId, response);
  return { sid: cookies.sid!, csrf: cookies.csrf! };
}

function cookieHeader(cookies: Partial<Cookies>): string {
  return Object.entries(cookies)
    .map(([name, value]) => `${name}=${encodeURIComponent(value)}`)
    .join('; ');
}

function changePassword(cookies: Cookies, body: object): request.Test {
  return request(server)
    .post('/users/me/password')
    .set('Cookie', cookieHeader(cookies))
    .set('X-CSRF-Token', cookies.csrf)
    .send(body);
}

async function sessionUserId(sid: string): Promise<unknown> {
  const response = await request(server)
    .get('/auth/session')
    .set('Cookie', cookieHeader({ sid }));
  return (response.body as { user: { id: string } | null }).user?.id ?? null;
}

async function storedHash(userId: string): Promise<string | null> {
  const [row] = await dataSource.query<{ passwordHash: string | null }[]>(
    'SELECT "passwordHash" FROM "user" WHERE id = $1',
    [userId],
  );
  return row.passwordHash;
}

async function emailJobsTo(
  email: string,
): Promise<{ subject: string; blocks: { type: string; url?: string }[] }[]> {
  const rows = await dataSource.query<
    { payload: { subject: string; blocks: { type: string; url?: string }[] } }[]
  >(
    `SELECT payload FROM job
     WHERE type = 'email.send' AND payload->>'to' = $1
     ORDER BY "createdAt", id`,
    [email],
  );
  return rows.map((row) => row.payload);
}

describe('troca de senha', () => {
  it('troca a senha, mantém a sessão atual e encerra as outras', async () => {
    const account = await createAccount();
    const current = await openSession(account.id);
    const other = await openSession(account.id);

    const response = await changePassword(current, {
      currentPassword: CURRENT_PASSWORD,
      newPassword: NEW_PASSWORD,
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: account.id,
      hasPassword: true,
    });
    const hash = await storedHash(account.id);
    expect(await hasher.verify(NEW_PASSWORD, hash)).toBe(true);
    expect(await hasher.verify(CURRENT_PASSWORD, hash)).toBe(false);
    expect(await sessionUserId(current.sid)).toBe(account.id);
    expect(await sessionUserId(other.sid)).toBeNull();
    // O token CSRF da sessão atual continua valendo.
    const next = await changePassword(current, {
      currentPassword: NEW_PASSWORD,
      newPassword: CURRENT_PASSWORD,
    });
    expect(next.status).toBe(200);
  });

  it('enfileira o aviso de senha alterada', async () => {
    const account = await createAccount();
    const current = await openSession(account.id);

    await changePassword(current, {
      currentPassword: CURRENT_PASSWORD,
      newPassword: NEW_PASSWORD,
    });

    expect((await emailJobsTo(account.email)).map((e) => e.subject)).toEqual([
      CHANGED_SUBJECT,
    ]);
  });

  it('recusa com 400 "Senha atual incorreta." sem mudar nada', async () => {
    const account = await createAccount();
    const current = await openSession(account.id);
    const other = await openSession(account.id);

    const wrong = await changePassword(current, {
      currentPassword: 'senha-errada-999',
      newPassword: NEW_PASSWORD,
    });
    const absent = await changePassword(current, {
      newPassword: NEW_PASSWORD,
    });

    expect(wrong.status).toBe(400);
    expect(wrong.body).toEqual(WRONG_PASSWORD);
    expect(absent.status).toBe(400);
    expect(absent.body).toEqual(WRONG_PASSWORD);
    expect(await storedHash(account.id)).toBe(currentHash);
    expect(await sessionUserId(other.sid)).toBe(account.id);
    expect(await emailJobsTo(account.email)).toEqual([]);
  });

  it('cria a senha de conta só Google sem pedir a atual', async () => {
    const account = await createAccount({ googleOnly: true });
    const current = await openSession(account.id);
    const other = await openSession(account.id);

    const response = await changePassword(current, {
      newPassword: NEW_PASSWORD,
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: account.id,
      hasPassword: true,
      hasGoogle: true,
    });
    expect(
      await hasher.verify(NEW_PASSWORD, await storedHash(account.id)),
    ).toBe(true);
    expect(await sessionUserId(current.sid)).toBe(account.id);
    expect(await sessionUserId(other.sid)).toBeNull();
    expect((await emailJobsTo(account.email)).map((e) => e.subject)).toEqual([
      CHANGED_SUBJECT,
    ]);
  });

  it('recusa com 400 senha nova com menos de 8 ou mais de 128 caracteres', async () => {
    const account = await createAccount();
    const current = await openSession(account.id);

    const statuses = [];
    for (const newPassword of ['a'.repeat(7), 'a'.repeat(129)]) {
      statuses.push(
        (
          await changePassword(current, {
            currentPassword: CURRENT_PASSWORD,
            newPassword,
          })
        ).status,
      );
    }
    const unchanged = await storedHash(account.id);
    const shortest = await changePassword(current, {
      currentPassword: CURRENT_PASSWORD,
      newPassword: 'a'.repeat(8),
    });

    expect(statuses).toEqual([400, 400]);
    expect(unchanged).toBe(currentHash);
    expect(shortest.status).toBe(200);
  });

  it('mantém válido o link de recuperação pendente', async () => {
    const account = await createAccount();
    const current = await openSession(account.id);
    const anonymous = await request(server).get('/auth/session');
    const csrf = decodeURIComponent(
      (anonymous.headers['set-cookie'] as unknown as string[])
        .find((c) => c.startsWith('csrf='))!
        .slice('csrf='.length)
        .split(';')[0],
    );
    await request(server)
      .post('/auth/password/forgot')
      .set('Cookie', cookieHeader({ csrf }))
      .set('X-CSRF-Token', csrf)
      .send({ email: account.email });
    const [resetEmail] = await emailJobsTo(account.email);
    const button = resetEmail.blocks.find((block) => block.type === 'button')!;
    const token = new URL(button.url!).searchParams.get('token');

    await changePassword(current, {
      currentPassword: CURRENT_PASSWORD,
      newPassword: NEW_PASSWORD,
    });
    const reset = await request(server)
      .post('/auth/password/reset')
      .set('Cookie', cookieHeader({ csrf }))
      .set('X-CSRF-Token', csrf)
      .send({ token, password: 'senha-do-link-789' });

    expect(reset.status).toBe(200);
    expect(
      await hasher.verify('senha-do-link-789', await storedHash(account.id)),
    ).toBe(true);
  });

  it('responde 429 na 11ª tentativa da mesma conta em 15 minutos sem verificar a senha', async () => {
    const account = await createAccount();
    const current = await openSession(account.id);
    const statuses = [];
    for (let attempt = 1; attempt <= 10; attempt++) {
      statuses.push(
        (
          await changePassword(current, {
            currentPassword: 'senha-errada-999',
            newPassword: NEW_PASSWORD,
          })
        ).status,
      );
    }

    // Com a senha certa: só o limite explica a recusa.
    const eleventh = await changePassword(current, {
      currentPassword: CURRENT_PASSWORD,
      newPassword: NEW_PASSWORD,
    });

    expect(statuses).toEqual(Array.from({ length: 10 }, () => 400));
    expect(eleventh.status).toBe(429);
    expect(eleventh.body).toMatchObject({
      statusCode: 429,
      message: 'Muitas tentativas. Tente de novo em 15 minutos.',
    });
    expect(await storedHash(account.id)).toBe(currentHash);
  });
});
