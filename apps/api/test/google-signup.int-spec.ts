import { randomUUID } from 'node:crypto';
import { TERMS_VERSION } from '@amigo-secreto/shared';
import { type INestApplication, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { DataSource } from 'typeorm';
import { configureApp } from '../src/app.setup.js';
import { signCookie } from '../src/auth/google/signed-cookie.js';
import { AppLogger } from '../src/observability/app-logger.js';
import { startFakeGoogle, type FakeGoogle } from './fake-google.js';
import { createIsolatedDatabase } from './isolated-database.js';

const CLIENT_ID = 'cliente-google-teste';
const AUTH_SECRET = 'segredo-do-cadastro-google';
const PICTURE = 'https://lh3.googleusercontent.com/a/bia';
const SIGNUP_EXPIRED = {
  statusCode: 401,
  message: 'Entre com Google de novo para continuar.',
  error: 'Unauthorized',
};

type Cookies = Record<string, string | undefined>;

let google: FakeGoogle;
let app: INestApplication;
let server: App;
let dataSource: DataSource;

beforeAll(async () => {
  google = await startFakeGoogle(CLIENT_ID);
  // O ConfigModule valida o ambiente quando o módulo é importado.
  vi.stubEnv('DATABASE_URL', await createIsolatedDatabase('google_signup'));
  vi.stubEnv('NODE_ENV', 'test');
  vi.stubEnv('AUTH_SECRET', AUTH_SECRET);
  vi.stubEnv('GOOGLE_CLIENT_ID', CLIENT_ID);
  vi.stubEnv('GOOGLE_CLIENT_SECRET', 'segredo-google-teste');
  vi.stubEnv('GOOGLE_AUTH_URL', google.authUrl);
  vi.stubEnv('GOOGLE_TOKEN_URL', google.tokenUrl);
  const { AuthFixtureModule } =
    await import('./fixtures/auth-fixture.module.js');
  app = await NestFactory.create(AuthFixtureModule, { logger: false });
  configureApp(app);
  await app.init();
  server = app.getHttpServer() as App;
  dataSource = app.get(DataSource);
});

afterAll(async () => {
  await app.close();
  await google.close();
  vi.unstubAllEnvs();
});

function setCookies(response: request.Response): string[] {
  return (response.headers['set-cookie'] as unknown as string[]) ?? [];
}

function cookieValue(
  response: request.Response,
  name: string,
): string | undefined {
  const cookie = setCookies(response).find((c) => c.startsWith(`${name}=`));
  return cookie === undefined
    ? undefined
    : decodeURIComponent(cookie.slice(name.length + 1).split(';')[0]);
}

function cookieHeader(cookies: Cookies): string {
  return Object.entries(cookies)
    .filter(([, value]) => value !== undefined)
    .map(([name, value]) => `${name}=${encodeURIComponent(value!)}`)
    .join('; ');
}

type Signup = { cookie: string; sub: string; email: string };

// Passa pelo retorno do Google com um e-mail verificado sem conta.
async function googleSignup(next = '/convite/abc'): Promise<Signup> {
  const sub = `sub-${randomUUID()}`;
  const email = `${randomUUID()}@exemplo.com`;
  google.replyWith({
    claims: { sub, email, name: 'Bia Lima', picture: PICTURE },
  });
  const started = await request(server)
    .get('/auth/google/start')
    .query({ next });
  const state = new URL(started.headers.location).searchParams.get('state')!;
  const callback = await request(server)
    .get('/auth/google/callback')
    .query({ code: 'code-do-google', state })
    .set('Cookie', cookieHeader({ g_oauth: cookieValue(started, 'g_oauth') }));
  expect(callback.headers.location).toBe('/completar-cadastro');
  return { cookie: cookieValue(callback, 'g_signup')!, sub, email };
}

async function anonymousCsrf(): Promise<string> {
  return cookieValue(await request(server).get('/auth/session'), 'csrf')!;
}

async function complete(
  body: object,
  signupCookie: string | undefined,
): Promise<request.Response> {
  const csrf = await anonymousCsrf();
  return request(server)
    .post('/auth/google/complete')
    .set('Cookie', cookieHeader({ csrf, g_signup: signupCookie }))
    .set('X-CSRF-Token', csrf)
    .send(body);
}

type StoredUser = {
  id: string;
  name: string;
  googleId: string | null;
  avatarUrl: string | null;
  passwordHash: string | null;
  emailVerifiedAt: Date | null;
  termsVersion: string;
  termsAcceptedAt: Date;
  marketingOptIn: boolean;
  marketingOptInAt: Date | null;
};

async function usersWithEmail(email: string): Promise<StoredUser[]> {
  return dataSource.query<StoredUser[]>(
    `SELECT id, name, "googleId", "avatarUrl", "passwordHash", "emailVerifiedAt",
            "termsVersion", "termsAcceptedAt", "marketingOptIn", "marketingOptInAt"
     FROM "user" WHERE email = $1`,
    [email],
  );
}

async function sessionUserId(sid: string | undefined): Promise<unknown> {
  const response = await request(server)
    .get('/auth/session')
    .set('Cookie', cookieHeader({ sid }));
  return (response.body as { user: { id: string } | null }).user?.id ?? null;
}

describe('completar cadastro com Google', () => {
  it('cria a conta confirmada, vinculada e com a foto do Google, abre a sessão e devolve o destino', async () => {
    const signup = await googleSignup('/convite/abc');
    const before = Date.now();

    const response = await complete(
      { name: '  Bia Souza  ', acceptTerms: true },
      signup.cookie,
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ next: '/convite/abc' });
    const [user] = await usersWithEmail(signup.email);
    expect(user).toMatchObject({
      name: 'Bia Souza',
      googleId: signup.sub,
      avatarUrl: PICTURE,
      passwordHash: null,
      termsVersion: TERMS_VERSION,
      marketingOptIn: false,
      marketingOptInAt: null,
    });
    expect(user.emailVerifiedAt!.getTime()).toBeGreaterThanOrEqual(
      before - 1000,
    );
    expect(user.termsAcceptedAt.getTime()).toBeGreaterThanOrEqual(
      before - 1000,
    );
    expect(await sessionUserId(cookieValue(response, 'sid'))).toBe(user.id);
    expect(setCookies(response).find((c) => c.startsWith('g_signup='))).toMatch(
      /^g_signup=;/,
    );
  });

  it('emite user.registered com method google e o id, sem e-mail nem nome', async () => {
    const signup = await googleSignup();
    const output: string[] = [];
    Logger.overrideLogger(new AppLogger('production'));
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
      output.push(String(chunk));
      return true;
    });
    try {
      await complete(
        { name: 'Nome Rastreável', acceptTerms: true },
        signup.cookie,
      );
    } finally {
      vi.restoreAllMocks();
      // O app do teste sobe com logger: false.
      Logger.overrideLogger(false);
    }

    const [user] = await usersWithEmail(signup.email);
    const events = output
      .flatMap((chunk) => chunk.split('\n'))
      .filter((line) => line.startsWith('{'))
      .map((line) => JSON.parse(line) as Record<string, unknown>)
      .filter((record) => record.event === 'user.registered');
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      event: 'user.registered',
      method: 'google',
      userId: user.id,
    });
    const line = JSON.stringify(events[0]);
    expect(line).not.toContain(signup.email);
    expect(line).not.toContain('Nome Rastreável');
  });

  it('recusa com 400 sem a caixa de termos', async () => {
    const signup = await googleSignup();

    const unchecked = await complete(
      { name: 'Bia Lima', acceptTerms: false },
      signup.cookie,
    );
    const absent = await complete({ name: 'Bia Lima' }, signup.cookie);

    expect(unchecked.status).toBe(400);
    expect(absent.status).toBe(400);
    expect(cookieValue(unchecked, 'sid')).toBeUndefined();
    expect(await usersWithEmail(signup.email)).toEqual([]);
  });

  it('grava o opt-in de marketing quando a caixa vem marcada', async () => {
    const signup = await googleSignup();
    const before = Date.now();

    const response = await complete(
      { name: 'Bia Lima', acceptTerms: true, marketingOptIn: true },
      signup.cookie,
    );

    expect(response.status).toBe(200);
    const [user] = await usersWithEmail(signup.email);
    expect(user.marketingOptIn).toBe(true);
    expect(user.marketingOptInAt!.getTime()).toBeGreaterThanOrEqual(
      before - 1000,
    );
  });

  it('vincula em vez de criar quando o e-mail ganhou conta no meio-tempo', async () => {
    const signup = await googleSignup('/convite/abc');
    const [account] = await dataSource.query<{ id: string }[]>(
      `INSERT INTO "user" (name, email, "passwordHash", "termsVersion", "termsAcceptedAt")
       VALUES ('Conta Antiga', $1, 'hash-qualquer', '2026-11-19', now()) RETURNING id`,
      [signup.email],
    );

    const response = await complete(
      { name: 'Bia Lima', acceptTerms: true },
      signup.cookie,
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ next: '/convite/abc' });
    const users = await usersWithEmail(signup.email);
    expect(users).toHaveLength(1);
    expect(users[0]).toMatchObject({
      id: account.id,
      name: 'Conta Antiga',
      googleId: signup.sub,
      avatarUrl: PICTURE,
    });
    expect(users[0].emailVerifiedAt).toBeInstanceOf(Date);
    expect(await sessionUserId(cookieValue(response, 'sid'))).toBe(account.id);
    const subjects = await dataSource.query<{ subject: string }[]>(
      `SELECT payload->>'subject' AS subject FROM job
       WHERE type = 'email.send' AND payload->>'to' = $1`,
      [signup.email],
    );
    expect(subjects).toEqual([
      { subject: 'Conta Google vinculada ao Amigo Secreto' },
    ]);
  });

  it('responde 409 quando o e-mail ganhou conta vinculada a outro Google, sem criar nem abrir sessão', async () => {
    const signup = await googleSignup();
    const otherGoogle = `sub-${randomUUID()}`;
    await dataSource.query(
      `INSERT INTO "user" (name, email, "googleId", "termsVersion", "termsAcceptedAt")
       VALUES ('Conta Antiga', $1, $2, '2026-11-19', now())`,
      [signup.email, otherGoogle],
    );

    const response = await complete(
      { name: 'Bia Lima', acceptTerms: true },
      signup.cookie,
    );

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      statusCode: 409,
      message: 'Não foi possível entrar com Google. Tente de novo.',
      error: 'Conflict',
    });
    expect(cookieValue(response, 'sid')).toBeUndefined();
    const users = await usersWithEmail(signup.email);
    expect(users).toHaveLength(1);
    expect(users[0].googleId).toBe(otherGoogle);
  });

  it('abre a sessão da conta quando o Google foi vinculado em outra aba', async () => {
    const signup = await googleSignup('/convite/abc');
    const first = await complete(
      { name: 'Bia Lima', acceptTerms: true },
      signup.cookie,
    );

    const second = await complete(
      { name: 'Outro Nome', acceptTerms: true },
      signup.cookie,
    );

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(second.body).toEqual({ next: '/convite/abc' });
    const users = await usersWithEmail(signup.email);
    expect(users).toHaveLength(1);
    expect(users[0].name).toBe('Bia Lima');
    expect(await sessionUserId(cookieValue(second, 'sid'))).toBe(users[0].id);
  });

  it('responde 401 sem o cookie g_signup, com ele vencido ou adulterado', async () => {
    const email = `${randomUUID()}@exemplo.com`;
    const data = {
      sub: `sub-${randomUUID()}`,
      email,
      name: 'Bia Lima',
      picture: PICTURE,
      next: '/perfil',
    };
    const expired = signCookie(AUTH_SECRET, data, -1000);
    const [, signature] = signCookie(AUTH_SECRET, data, 60_000).split('.');
    const forged = `${Buffer.from(
      JSON.stringify({ data, exp: Date.now() + 60_000 + 1 }),
    ).toString('base64url')}.${signature}`;
    const body = { name: 'Bia Lima', acceptTerms: true };

    for (const cookie of [undefined, expired, forged]) {
      const response = await complete(body, cookie);
      expect(response.status).toBe(401);
      expect(response.body).toEqual(SIGNUP_EXPIRED);
      expect(cookieValue(response, 'sid')).toBeUndefined();
    }
    expect(await usersWithEmail(email)).toEqual([]);
  });

  it('GET /auth/google/signup devolve o nome e o e-mail do Google', async () => {
    const signup = await googleSignup();

    const response = await request(server)
      .get('/auth/google/signup')
      .set('Cookie', cookieHeader({ g_signup: signup.cookie }));
    const without = await request(server).get('/auth/google/signup');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ name: 'Bia Lima', email: signup.email });
    expect(without.status).toBe(401);
    expect(without.body).toEqual(SIGNUP_EXPIRED);
  });
});
