import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { DataSource } from 'typeorm';
import { configureApp } from '../src/app.setup.js';
import type { CookieResponse } from '../src/auth/cookies.js';
import { SessionsService } from '../src/auth/sessions.service.js';
import { createIsolatedDatabase } from './isolated-database.js';

type Cookies = { sid: string; csrf: string };

let app: INestApplication;
let server: App;
let dataSource: DataSource;
let sessions: SessionsService;

beforeAll(async () => {
  // O ConfigModule valida o ambiente quando o módulo é importado.
  vi.stubEnv('DATABASE_URL', await createIsolatedDatabase('profile'));
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

type Account = { id: string; email: string };

async function createAccount(
  options: { marketingOptIn?: boolean; avatarUrl?: string | null } = {},
): Promise<Account> {
  const email = `${randomUUID()}@exemplo.com`;
  const [row] = await dataSource.query<{ id: string }[]>(
    `INSERT INTO "user" (name, email, "passwordHash", "avatarUrl", "emailVerifiedAt",
       "termsVersion", "termsAcceptedAt", "marketingOptIn", "marketingOptInAt")
     VALUES ('Ana Souza', $1, 'hash-qualquer', $2, now(), '2026-11-19', now(), $3, $4)
     RETURNING id`,
    [
      email,
      options.avatarUrl ?? null,
      options.marketingOptIn ?? false,
      options.marketingOptIn ? new Date('2026-01-01T00:00:00Z') : null,
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

function cookieHeader({ sid, csrf }: Cookies): string {
  return `sid=${encodeURIComponent(sid)}; csrf=${encodeURIComponent(csrf)}`;
}

function patchProfile(cookies: Cookies, body: object): request.Test {
  return request(server)
    .patch('/users/me')
    .set('Cookie', cookieHeader(cookies))
    .set('X-CSRF-Token', cookies.csrf)
    .send(body);
}

type StoredProfile = {
  name: string;
  marketingOptIn: boolean;
  marketingOptInAt: Date | null;
};

async function storedProfile(id: string): Promise<StoredProfile> {
  const [row] = await dataSource.query<StoredProfile[]>(
    'SELECT name, "marketingOptIn", "marketingOptInAt" FROM "user" WHERE id = $1',
    [id],
  );
  return row;
}

describe('perfil', () => {
  it('GET /users/me devolve nome, e-mail, foto e opt-in', async () => {
    const account = await createAccount({
      marketingOptIn: true,
      avatarUrl: 'https://lh3.googleusercontent.com/a/ana',
    });
    const cookies = await openSession(account.id);

    const response = await request(server)
      .get('/users/me')
      .set('Cookie', cookieHeader(cookies));

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: account.id,
      name: 'Ana Souza',
      email: account.email,
      avatarUrl: 'https://lh3.googleusercontent.com/a/ana',
      emailVerified: true,
      hasPassword: true,
      hasGoogle: false,
      marketingOptIn: true,
    });
  });

  it('PATCH grava o nome sem os espaços das pontas', async () => {
    const account = await createAccount();
    const cookies = await openSession(account.id);

    const response = await patchProfile(cookies, { name: '  Bia Souza  ' });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: account.id,
      name: 'Bia Souza',
      email: account.email,
    });
    expect((await storedProfile(account.id)).name).toBe('Bia Souza');
    const me = await request(server)
      .get('/users/me')
      .set('Cookie', cookieHeader(cookies));
    expect((me.body as { name: string }).name).toBe('Bia Souza');
  });

  it('PATCH recusa com 400 nome vazio ou com 81 caracteres e mantém o anterior', async () => {
    const account = await createAccount();
    const cookies = await openSession(account.id);

    for (const name of ['', '    ', 'a'.repeat(81), null]) {
      const response = await patchProfile(cookies, { name });
      expect(response.status).toBe(400);
    }
    const eighty = await patchProfile(cookies, { name: 'a'.repeat(80) });

    expect(eighty.status).toBe(200);
    expect((await storedProfile(account.id)).name).toBe('a'.repeat(80));
  });

  it('PATCH grava o opt-in com a data da mudança', async () => {
    const account = await createAccount({ marketingOptIn: false });
    const cookies = await openSession(account.id);

    const before = Date.now();
    const optIn = await patchProfile(cookies, { marketingOptIn: true });
    const after = Date.now();
    const afterOptIn = await storedProfile(account.id);
    const same = await patchProfile(cookies, { marketingOptIn: true });
    const afterSame = await storedProfile(account.id);
    const optOut = await patchProfile(cookies, { marketingOptIn: false });
    const afterOptOut = await storedProfile(account.id);

    expect(optIn.status).toBe(200);
    expect((optIn.body as { marketingOptIn: boolean }).marketingOptIn).toBe(
      true,
    );
    expect(afterOptIn.marketingOptIn).toBe(true);
    expect(afterOptIn.marketingOptInAt!.getTime()).toBeGreaterThanOrEqual(
      before,
    );
    expect(afterOptIn.marketingOptInAt!.getTime()).toBeLessThanOrEqual(after);
    expect(same.status).toBe(200);
    expect(afterSame.marketingOptInAt).toEqual(afterOptIn.marketingOptInAt);
    expect(optOut.status).toBe(200);
    expect(afterOptOut.marketingOptIn).toBe(false);
    expect(afterOptOut.marketingOptInAt!.getTime()).toBeGreaterThanOrEqual(
      afterOptIn.marketingOptInAt!.getTime(),
    );
    expect(afterOptOut.marketingOptInAt).not.toEqual(
      afterOptIn.marketingOptInAt,
    );
  });
});
