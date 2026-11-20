import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { DataSource } from 'typeorm';
import { configureApp } from '../src/app.setup.js';
import { PasswordHasher } from '../src/auth/password-hasher.js';
import { createIsolatedDatabase } from './isolated-database.js';

const PASSWORD = 'senha-forte-123';
const INVALID_CREDENTIALS = {
  statusCode: 401,
  message: 'E-mail ou senha incorretos.',
  error: 'Unauthorized',
};

type Cookies = { sid?: string; csrf?: string };

let app: INestApplication;
let server: App;
let dataSource: DataSource;
let passwordHash: string;
let ipCounter = 0;

beforeAll(async () => {
  // O ConfigModule valida o ambiente quando o módulo é importado.
  vi.stubEnv('DATABASE_URL', await createIsolatedDatabase('login'));
  vi.stubEnv('NODE_ENV', 'test');
  // Cada teste fala de um IP próprio, pelo X-Forwarded-For de um proxy.
  vi.stubEnv('TRUST_PROXY_HOPS', '1');
  const { AuthFixtureModule } =
    await import('./fixtures/auth-fixture.module.js');
  app = await NestFactory.create(AuthFixtureModule, { logger: false });
  configureApp(app);
  await app.init();
  server = app.getHttpServer() as App;
  dataSource = app.get(DataSource);
  passwordHash = await new PasswordHasher().hash(PASSWORD);
});

afterAll(async () => {
  await app.close();
  vi.unstubAllEnvs();
});

function newIp(): string {
  ipCounter += 1;
  return `10.3.${Math.floor(ipCounter / 256)}.${ipCounter % 256}`;
}

function setCookies(response: request.Response): string[] {
  return (response.headers['set-cookie'] as unknown as string[]) ?? [];
}

function rawCookie(
  response: request.Response,
  name: string,
): string | undefined {
  return setCookies(response).find((c) => c.startsWith(`${name}=`));
}

function cookieValue(
  response: request.Response,
  name: string,
): string | undefined {
  const cookie = rawCookie(response, name);
  return cookie === undefined
    ? undefined
    : decodeURIComponent(cookie.slice(name.length + 1).split(';')[0]);
}

function cookieHeader(cookies: Cookies): string {
  return Object.entries(cookies)
    .filter(([, value]) => value !== undefined && value !== '')
    .map(([name, value]) => `${name}=${encodeURIComponent(value)}`)
    .join('; ');
}

async function anonymousCsrf(): Promise<string> {
  return cookieValue(await request(server).get('/auth/session'), 'csrf')!;
}

async function post(
  path: string,
  body: object,
  cookies: Cookies,
  ip: string = newIp(),
): Promise<request.Response> {
  return request(server)
    .post(path)
    .set('X-Forwarded-For', ip)
    .set('Cookie', cookieHeader(cookies))
    .set('X-CSRF-Token', cookies.csrf ?? '')
    .send(body);
}

async function createAccount(
  options: { hasPassword?: boolean } = {},
): Promise<{ id: string; email: string }> {
  const email = `${randomUUID()}@exemplo.com`;
  const hasPassword = options.hasPassword ?? true;
  const [row] = await dataSource.query<{ id: string }[]>(
    `INSERT INTO "user" (name, email, "passwordHash", "googleId", "termsVersion", "termsAcceptedAt")
     VALUES ('Ana Souza', $1, $2, $3, '2026-11-19', now()) RETURNING id`,
    [
      email,
      hasPassword ? passwordHash : null,
      hasPassword ? null : randomUUID(),
    ],
  );
  return { id: row.id, email };
}

async function login(
  email: string,
  password: string,
  options: { ip?: string; cookies?: Cookies } = {},
): Promise<request.Response> {
  const cookies = options.cookies ?? { csrf: await anonymousCsrf() };
  return post('/auth/login', { email, password }, cookies, options.ip);
}

// Os cookies que o navegador guarda depois de uma resposta que abre sessão.
function browserCookies(response: request.Response): Required<Cookies> {
  return {
    sid: cookieValue(response, 'sid')!,
    csrf: cookieValue(response, 'csrf')!,
  };
}

async function sessionUser(sid: string): Promise<unknown> {
  const response = await request(server)
    .get('/auth/session')
    .set('Cookie', cookieHeader({ sid }));
  return (response.body as { user: unknown }).user;
}

async function sessionCount(userId: string): Promise<number> {
  const [row] = await dataSource.query<{ count: number }[]>(
    'SELECT count(*)::int AS count FROM session WHERE "userId" = $1',
    [userId],
  );
  return row.count;
}

describe('login e logout', () => {
  it('abre a sessão com a senha certa e devolve o usuário', async () => {
    const { id, email } = await createAccount();

    const response = await login(email, PASSWORD);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      user: {
        id,
        name: 'Ana Souza',
        email,
        avatarUrl: null,
        emailVerified: false,
        hasPassword: true,
        hasGoogle: false,
        marketingOptIn: false,
      },
    });
    const sid = rawCookie(response, 'sid');
    expect(sid).toMatch(/; HttpOnly/);
    expect(sid).toMatch(/; SameSite=Lax/);
    expect(await sessionUser(cookieValue(response, 'sid')!)).toMatchObject({
      id,
    });
  });

  it('responde 401 "E-mail ou senha incorretos." a e-mail sem conta', async () => {
    const response = await login(`${randomUUID()}@exemplo.com`, PASSWORD);

    expect(response.status).toBe(401);
    expect(response.body).toEqual(INVALID_CREDENTIALS);
    expect(rawCookie(response, 'sid')).toBeUndefined();
  });

  it('responde 401 "E-mail ou senha incorretos." a senha errada', async () => {
    const { id, email } = await createAccount();

    const response = await login(email, 'senha-errada-999');

    expect(response.status).toBe(401);
    expect(response.body).toEqual(INVALID_CREDENTIALS);
    expect(rawCookie(response, 'sid')).toBeUndefined();
    expect(await sessionCount(id)).toBe(0);
  });

  it('responde 401 "E-mail ou senha incorretos." a conta só Google', async () => {
    const { id, email } = await createAccount({ hasPassword: false });

    const response = await login(email, PASSWORD);

    expect(response.status).toBe(401);
    expect(response.body).toEqual(INVALID_CREDENTIALS);
    expect(await sessionCount(id)).toBe(0);
  });

  it('encerra a sessão e apaga o cookie no logout', async () => {
    const { id, email } = await createAccount();
    const cookies = browserCookies(await login(email, PASSWORD));

    const response = await post('/auth/logout', {}, cookies);

    expect(response.status).toBe(204);
    expect(rawCookie(response, 'sid')).toMatch(
      /^sid=;.*Expires=Thu, 01 Jan 1970/,
    );
    expect(await sessionCount(id)).toBe(0);
    expect(await sessionUser(cookies.sid)).toBeNull();
  });

  it('mantém duas sessões independentes em dois logins', async () => {
    const { id, email } = await createAccount();
    const first = browserCookies(await login(email, PASSWORD));
    const second = browserCookies(await login(email, PASSWORD));

    expect(first.sid).not.toBe(second.sid);
    expect(await sessionCount(id)).toBe(2);
    expect((await post('/auth/logout', {}, first)).status).toBe(204);

    expect(await sessionUser(first.sid)).toBeNull();
    expect(await sessionUser(second.sid)).toMatchObject({ id });
  });

  it('encerra todas as sessões em sair de todos os dispositivos', async () => {
    const { id, email } = await createAccount();
    const first = browserCookies(await login(email, PASSWORD));
    const second = browserCookies(await login(email, PASSWORD));

    const response = await post('/auth/logout-all', {}, first);

    expect(response.status).toBe(204);
    expect(rawCookie(response, 'sid')).toMatch(
      /^sid=;.*Expires=Thu, 01 Jan 1970/,
    );
    expect(await sessionCount(id)).toBe(0);
    expect(await sessionUser(first.sid)).toBeNull();
    expect(await sessionUser(second.sid)).toBeNull();
  });

  it('responde 429 na 11ª tentativa do mesmo e-mail em 15 minutos sem verificar a senha', async () => {
    const { id, email } = await createAccount();
    const statuses = [];
    for (let attempt = 1; attempt <= 10; attempt++) {
      statuses.push((await login(email, 'senha-errada-999')).status);
    }

    // Com a senha certa: só o limite explica a recusa.
    const eleventh = await login(email, PASSWORD);

    expect(statuses).toEqual(Array.from({ length: 10 }, () => 401));
    expect(eleventh.status).toBe(429);
    expect(eleventh.body).toMatchObject({
      statusCode: 429,
      message: 'Muitas tentativas. Tente de novo em 15 minutos.',
    });
    expect(rawCookie(eleventh, 'sid')).toBeUndefined();
    expect(await sessionCount(id)).toBe(0);
  });

  it('responde 429 na 31ª tentativa do mesmo IP em 15 minutos', async () => {
    const ip = newIp();
    const statuses = [];
    for (let attempt = 1; attempt <= 30; attempt++) {
      statuses.push(
        (await login(`${randomUUID()}@exemplo.com`, PASSWORD, { ip })).status,
      );
    }
    const { id, email } = await createAccount();

    const last = await login(email, PASSWORD, { ip });

    expect(statuses).toEqual(Array.from({ length: 30 }, () => 401));
    expect(last.status).toBe(429);
    expect(await sessionCount(id)).toBe(0);
  });

  it('conta as tentativas pelo IP do X-Forwarded-For com TRUST_PROXY_HOPS 1', async () => {
    const blockedIp = newIp();
    for (let attempt = 1; attempt <= 30; attempt++) {
      await login(`${randomUUID()}@exemplo.com`, PASSWORD, { ip: blockedIp });
    }
    const { email } = await createAccount();

    const fromBlocked = await login(email, PASSWORD, { ip: blockedIp });
    const fromOther = await login(email, PASSWORD, { ip: newIp() });

    expect(fromBlocked.status).toBe(429);
    expect(fromOther.status).toBe(200);
  });

  it('troca o token CSRF ao abrir e ao encerrar a sessão', async () => {
    const { email } = await createAccount();
    const anonymous = await anonymousCsrf();

    const opened = await login(email, PASSWORD, {
      cookies: { csrf: anonymous },
    });
    const session = browserCookies(opened);
    const closed = await post('/auth/logout', {}, session);
    const afterLogout = cookieValue(closed, 'csrf')!;

    expect(session.csrf).not.toBe(anonymous);
    expect(closed.status).toBe(204);
    expect(afterLogout).not.toBe(session.csrf);
    // O token novo vale para quem ficou sem sessão; o da sessão, não.
    expect(
      (await login(email, PASSWORD, { cookies: { csrf: afterLogout } })).status,
    ).toBe(200);
    expect(
      (await login(email, PASSWORD, { cookies: { csrf: session.csrf } }))
        .status,
    ).toBe(403);
  });

  it('encerra a sessão que o navegador já tinha ao entrar', async () => {
    const other = await createAccount();
    const previous = browserCookies(await login(other.email, PASSWORD));
    const { id, email } = await createAccount();

    const response = await login(email, PASSWORD, { cookies: previous });

    expect(response.status).toBe(200);
    expect(await sessionCount(other.id)).toBe(0);
    expect(await sessionUser(previous.sid)).toBeNull();
    expect(await sessionUser(cookieValue(response, 'sid')!)).toMatchObject({
      id,
    });
  });

  it('recusa com 400 e-mail inválido ou senha vazia sem contar tentativa', async () => {
    const { email } = await createAccount();
    const statuses = [];
    for (let attempt = 1; attempt <= 11; attempt++) {
      statuses.push((await login(email, '')).status);
    }
    const invalidEmail = await login(`${randomUUID()}@`, PASSWORD);
    const longPassword = await login(email, 'a'.repeat(129));

    const valid = await login(email, PASSWORD);

    expect(statuses).toEqual(Array.from({ length: 11 }, () => 400));
    expect(invalidEmail.status).toBe(400);
    expect(longPassword.status).toBe(400);
    expect(valid.status).toBe(200);
  });
});
