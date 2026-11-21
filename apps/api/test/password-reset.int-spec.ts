import { randomUUID } from 'node:crypto';
import { type INestApplication, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { DataSource } from 'typeorm';
import { configureApp } from '../src/app.setup.js';
import type { CookieResponse } from '../src/auth/cookies.js';
import { PasswordHasher } from '../src/auth/password-hasher.js';
import { SessionsService } from '../src/auth/sessions.service.js';
import { AppLogger } from '../src/observability/app-logger.js';
import { createIsolatedDatabase } from './isolated-database.js';

const OLD_PASSWORD = 'senha-antiga-123';
const NEW_PASSWORD = 'senha-nova-456';
const RESET_SUBJECT = 'Redefina sua senha do Amigo Secreto';
const HOUR_MS = 60 * 60 * 1000;
const GONE = {
  statusCode: 410,
  message: 'Este link expirou ou já foi usado.',
  error: 'Gone',
};

type Cookies = { sid?: string; csrf?: string };

let app: INestApplication;
let server: App;
let dataSource: DataSource;
let sessions: SessionsService;
const hasher = new PasswordHasher();
let oldPasswordHash: string;
let ipCounter = 0;

beforeAll(async () => {
  // O ConfigModule valida o ambiente quando o módulo é importado.
  vi.stubEnv('DATABASE_URL', await createIsolatedDatabase('password_reset'));
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
  sessions = app.get(SessionsService);
  oldPasswordHash = await hasher.hash(OLD_PASSWORD);
});

afterAll(async () => {
  await app.close();
  vi.unstubAllEnvs();
});

function newIp(): string {
  ipCounter += 1;
  return `10.4.${Math.floor(ipCounter / 256)}.${ipCounter % 256}`;
}

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
    .map(([name, value]) => `${name}=${encodeURIComponent(value)}`)
    .join('; ');
}

async function anonymousCsrf(): Promise<string> {
  return cookieValue(await request(server).get('/auth/session'), 'csrf')!;
}

async function post(
  path: string,
  body: object,
  cookies?: Cookies,
  ip: string = newIp(),
): Promise<request.Response> {
  const sent = cookies ?? { csrf: await anonymousCsrf() };
  return request(server)
    .post(path)
    .set('X-Forwarded-For', ip)
    .set('Cookie', cookieHeader(sent))
    .set('X-CSRF-Token', sent.csrf ?? '')
    .send(body);
}

type Account = { id: string; email: string };

async function createAccount(
  options: { hasPassword?: boolean } = {},
): Promise<Account> {
  const email = `${randomUUID()}@exemplo.com`;
  const hasPassword = options.hasPassword ?? true;
  const [row] = await dataSource.query<{ id: string }[]>(
    `INSERT INTO "user" (name, email, "passwordHash", "googleId", "termsVersion", "termsAcceptedAt")
     VALUES ('Ana Souza', $1, $2, $3, '2026-11-19', now()) RETURNING id`,
    [
      email,
      hasPassword ? oldPasswordHash : null,
      hasPassword ? null : randomUUID(),
    ],
  );
  return { id: row.id, email };
}

function capture(cookies: Cookies): CookieResponse {
  return {
    cookie: (name, value) => {
      if (name === 'sid' || name === 'csrf') cookies[name] = value;
    },
    clearCookie: () => undefined,
  };
}

// Abre uma sessão como o login faz: grava sid e um csrf da sessão nova.
async function openSession(userId: string): Promise<Required<Cookies>> {
  const cookies: Cookies = {};
  await sessions.create(userId, capture(cookies));
  return { sid: cookies.sid!, csrf: cookies.csrf! };
}

async function emailJobsTo(
  email: string,
  subject?: string,
): Promise<{ subject: string; blocks: { type: string; url?: string }[] }[]> {
  const rows = await dataSource.query<
    { payload: { subject: string; blocks: { type: string; url?: string }[] } }[]
  >(
    `SELECT payload FROM job
     WHERE type = 'email.send' AND payload->>'to' = $1
     ORDER BY "createdAt", id`,
    [email],
  );
  return rows
    .map((row) => row.payload)
    .filter((payload) => subject === undefined || payload.subject === subject);
}

async function resetLinks(email: string): Promise<URL[]> {
  return (await emailJobsTo(email, RESET_SUBJECT)).map((payload) => {
    const button = payload.blocks.find((block) => block.type === 'button');
    return new URL(button!.url!);
  });
}

async function requestReset(
  email: string,
  next?: string,
): Promise<{ response: request.Response; token: string | undefined }> {
  const response = await post('/auth/password/forgot', {
    email,
    ...(next === undefined ? {} : { next }),
  });
  const links = await resetLinks(email.trim().toLowerCase());
  return {
    response,
    token: links.at(-1)?.searchParams.get('token') ?? undefined,
  };
}

async function reset(
  token: string,
  password: string = NEW_PASSWORD,
  cookies?: Cookies,
): Promise<request.Response> {
  return post(
    '/auth/password/reset',
    { token, password },
    cookies ? { ...cookies } : undefined,
  );
}

async function storedHash(userId: string): Promise<string | null> {
  const [row] = await dataSource.query<{ passwordHash: string | null }[]>(
    'SELECT "passwordHash" FROM "user" WHERE id = $1',
    [userId],
  );
  return row.passwordHash;
}

async function sessionUser(sid: string): Promise<unknown> {
  const response = await request(server)
    .get('/auth/session')
    .set('Cookie', cookieHeader({ sid }));
  return (response.body as { user: unknown }).user;
}

describe('recuperação de senha', () => {
  it('responde 202 igual com e sem conta', async () => {
    const { email } = await createAccount();
    const unknown = `${randomUUID()}@exemplo.com`;

    const withAccount = await post('/auth/password/forgot', {
      email: `  ${email.toUpperCase()} `,
    });
    const withoutAccount = await post('/auth/password/forgot', {
      email: unknown,
    });

    expect(withAccount.status).toBe(202);
    expect(withoutAccount.status).toBe(202);
    expect(withAccount.body).toEqual({ email });
    expect(withoutAccount.body).toEqual({ email: unknown });
  });

  it('enfileira o e-mail com link de 1 hora e invalida o anterior', async () => {
    const { id, email } = await createAccount();
    const { token: first } = await requestReset(email);
    const before = Date.now();

    const { token: second } = await requestReset(email);

    const links = await resetLinks(email);
    expect(links).toHaveLength(2);
    expect(`${links[1].origin}${links[1].pathname}`).toBe(
      'http://localhost:3000/redefinir-senha',
    );
    const [row] = await dataSource.query<{ expiresAt: Date }[]>(
      `SELECT "expiresAt" FROM auth_token WHERE "userId" = $1 AND type = 'password_reset'`,
      [id],
    );
    expect(row.expiresAt.getTime()).toBeGreaterThanOrEqual(before + HOUR_MS);
    expect(row.expiresAt.getTime()).toBeLessThanOrEqual(Date.now() + HOUR_MS);
    expect((await reset(first!)).status).toBe(410);
    expect((await reset(second!)).status).toBe(200);
  });

  it('não enfileira e-mail para e-mail sem conta', async () => {
    const unknown = `${randomUUID()}@exemplo.com`;

    const response = await post('/auth/password/forgot', { email: unknown });

    expect(response.status).toBe(202);
    expect(await emailJobsTo(unknown)).toEqual([]);
  });

  it('troca a senha, confirma o e-mail, encerra todas as sessões e abre uma nova', async () => {
    const { id, email } = await createAccount();
    const first = await openSession(id);
    const second = await openSession(id);
    const other = await createAccount();
    const browser = await openSession(other.id);
    const { token } = await requestReset(email, '/grupos/abc');

    const response = await reset(token!, NEW_PASSWORD, browser);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ next: '/grupos/abc' });
    expect(await hasher.verify(NEW_PASSWORD, await storedHash(id))).toBe(true);
    expect(await hasher.verify(OLD_PASSWORD, await storedHash(id))).toBe(false);
    const [user] = await dataSource.query<{ emailVerifiedAt: Date | null }[]>(
      'SELECT "emailVerifiedAt" FROM "user" WHERE id = $1',
      [id],
    );
    expect(user.emailVerifiedAt).toBeInstanceOf(Date);
    expect(await sessionUser(first.sid)).toBeNull();
    expect(await sessionUser(second.sid)).toBeNull();
    expect(await sessionUser(browser.sid)).toBeNull();
    const [count] = await dataSource.query<{ count: number }[]>(
      'SELECT count(*)::int AS count FROM session WHERE "userId" = $1',
      [id],
    );
    expect(count.count).toBe(1);
    expect(await sessionUser(cookieValue(response, 'sid')!)).toMatchObject({
      id,
      emailVerified: true,
    });
  });

  it('enfileira o aviso de senha alterada', async () => {
    const { email } = await createAccount();
    const { token } = await requestReset(email);

    await reset(token!);

    const notices = await emailJobsTo(
      email,
      'Sua senha do Amigo Secreto foi alterada',
    );
    expect(notices).toHaveLength(1);
  });

  it('responde 410 a link com mais de 1 hora', async () => {
    const { id, email } = await createAccount();
    const { token } = await requestReset(email);
    await dataSource.query(
      `UPDATE auth_token SET "expiresAt" = now() - interval '1 second' WHERE "userId" = $1`,
      [id],
    );

    const response = await reset(token!);

    expect(response.status).toBe(410);
    expect(response.body).toEqual(GONE);
    expect(await storedHash(id)).toBe(oldPasswordHash);
    expect(cookieValue(response, 'sid')).toBeUndefined();
  });

  it('responde 410 a link usado', async () => {
    const { id, email } = await createAccount();
    const { token } = await requestReset(email);
    expect((await reset(token!)).status).toBe(200);
    const afterFirstUse = await storedHash(id);

    const response = await reset(token!, 'outra-senha-789');

    expect(response.status).toBe(410);
    expect(response.body).toEqual(GONE);
    expect(await storedHash(id)).toBe(afterFirstUse);
  });

  it('responde 410 a link substituído por um pedido mais novo', async () => {
    const { id, email } = await createAccount();
    const { token: older } = await requestReset(email);
    await requestReset(email);

    const response = await reset(older!);

    expect(response.status).toBe(410);
    expect(response.body).toEqual(GONE);
    expect(await storedHash(id)).toBe(oldPasswordHash);
  });

  it('cria a senha de uma conta só Google, que passa a entrar com e-mail e senha', async () => {
    const { id, email } = await createAccount({ hasPassword: false });
    const { token } = await requestReset(email);

    expect((await reset(token!)).status).toBe(200);

    const login = await post('/auth/login', { email, password: NEW_PASSWORD });
    expect(login.status).toBe(200);
    expect(login.body).toMatchObject({
      user: { id, hasPassword: true, hasGoogle: true },
    });
  });

  it('responde 429 no 6º pedido do mesmo e-mail em 1 hora sem enfileirar e-mail', async () => {
    const { email } = await createAccount();
    const statuses = [];
    for (let attempt = 1; attempt <= 5; attempt++) {
      statuses.push((await requestReset(email)).response.status);
    }

    const sixth = await post('/auth/password/forgot', { email });

    expect(statuses).toEqual([202, 202, 202, 202, 202]);
    expect(sixth.status).toBe(429);
    expect(sixth.body).toMatchObject({
      statusCode: 429,
      message: 'Muitas tentativas. Tente de novo em 60 minutos.',
    });
    expect(await resetLinks(email)).toHaveLength(5);
  });

  it('responde 429 no 21º pedido do mesmo IP em 1 hora', async () => {
    const ip = newIp();
    const statuses = [];
    for (let attempt = 1; attempt <= 20; attempt++) {
      const { email } = await createAccount();
      statuses.push(
        (await post('/auth/password/forgot', { email }, undefined, ip)).status,
      );
    }
    const { email } = await createAccount();

    const last = await post('/auth/password/forgot', { email }, undefined, ip);

    expect(statuses).toEqual(Array.from({ length: 20 }, () => 202));
    expect(last.status).toBe(429);
    expect(await resetLinks(email)).toHaveLength(0);
  });

  it('recusa com 400 senha nova com menos de 8 ou mais de 128 caracteres', async () => {
    const { id, email } = await createAccount();
    const { token } = await requestReset(email);

    const short = await reset(token!, 'a'.repeat(7));
    const long = await reset(token!, 'a'.repeat(129));

    expect(short.status).toBe(400);
    expect(long.status).toBe(400);
    expect(await storedHash(id)).toBe(oldPasswordHash);
    expect((await reset(token!)).status).toBe(200);
  });

  it('emite user.email_verified quando a conta não tinha o e-mail confirmado', async () => {
    const unverified = await createAccount();
    const verified = await createAccount();
    await dataSource.query(
      'UPDATE "user" SET "emailVerifiedAt" = now() WHERE id = $1',
      [verified.id],
    );
    const { token: unverifiedToken } = await requestReset(unverified.email);
    const { token: verifiedToken } = await requestReset(verified.email);
    const output: string[] = [];
    Logger.overrideLogger(new AppLogger('production'));
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
      output.push(String(chunk));
      return true;
    });
    try {
      await reset(unverifiedToken!);
      await reset(verifiedToken!);
    } finally {
      vi.restoreAllMocks();
      // O app do teste sobe com logger: false.
      Logger.overrideLogger(false);
    }

    const events = output
      .flatMap((chunk) => chunk.split('\n'))
      .filter((line) => line.startsWith('{'))
      .map((line) => JSON.parse(line) as Record<string, unknown>)
      .filter((record) => record.event === 'user.email_verified');
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      event: 'user.email_verified',
      userId: unverified.id,
    });
  });
});
