import { randomUUID } from 'node:crypto';
import { type INestApplication, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { DataSource } from 'typeorm';
import { configureApp } from '../src/app.setup.js';
import type { CookieResponse } from '../src/auth/cookies.js';
import { SessionsService } from '../src/auth/sessions.service.js';
import { AppLogger } from '../src/observability/app-logger.js';
import { createIsolatedDatabase } from './isolated-database.js';

const GONE = {
  statusCode: 410,
  message: 'Este link expirou ou já foi usado.',
  error: 'Gone',
};
const CONFIRMATION_SUBJECT = 'Confirme seu e-mail no Amigo Secreto';

type Cookies = { sid?: string; csrf?: string };

let app: INestApplication;
let server: App;
let dataSource: DataSource;
let sessions: SessionsService;
let ipCounter = 0;

beforeAll(async () => {
  // O ConfigModule valida o ambiente quando o módulo é importado.
  vi.stubEnv('DATABASE_URL', await createIsolatedDatabase('email_verify'));
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
});

afterAll(async () => {
  await app.close();
  vi.unstubAllEnvs();
});

function newIp(): string {
  ipCounter += 1;
  return `10.2.${Math.floor(ipCounter / 256)}.${ipCounter % 256}`;
}

function setCookies(response: request.Response): string[] {
  return (response.headers['set-cookie'] as unknown as string[]) ?? [];
}

function cookieFrom(
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
  return cookieFrom(await request(server).get('/auth/session'), 'csrf')!;
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

async function confirmationTokens(email: string): Promise<string[]> {
  const jobs = await dataSource.query<
    { payload: { blocks: { type: string; url?: string }[] } }[]
  >(
    `SELECT payload FROM job
     WHERE type = 'email.send' AND payload->>'to' = $1
       AND payload->>'subject' = $2
     ORDER BY "createdAt", id`,
    [email, CONFIRMATION_SUBJECT],
  );
  return jobs.map((job) => {
    const button = job.payload.blocks.find((block) => block.type === 'button');
    return new URL(button!.url!).searchParams.get('token')!;
  });
}

// Cadastra pela rota e devolve o token do link de confirmação enviado.
async function registerAccount(
  next?: string,
): Promise<{ email: string; userId: string; token: string }> {
  const email = `${randomUUID()}@exemplo.com`;
  const csrf = await anonymousCsrf();
  const response = await post(
    '/auth/register',
    {
      name: 'Ana Souza',
      email,
      password: 'senha-forte-123',
      acceptTerms: true,
      ...(next === undefined ? {} : { next }),
    },
    { csrf },
  );
  expect(response.status).toBe(202);
  const [user] = await dataSource.query<{ id: string }[]>(
    'SELECT id FROM "user" WHERE email = $1',
    [email],
  );
  const [token] = await confirmationTokens(email);
  return { email, userId: user.id, token };
}

function capture(cookies: Cookies): CookieResponse {
  return {
    cookie: (name, value) => {
      if (name === 'sid' || name === 'csrf') cookies[name] = value;
    },
    clearCookie: () => undefined,
  };
}

// Abre uma sessão como o login fará: grava sid e um csrf da sessão nova.
async function openSession(
  userId: string,
): Promise<Required<Cookies> & { sessionId: string }> {
  const cookies: Cookies = {};
  const session = await sessions.create(userId, capture(cookies));
  return { sid: cookies.sid!, csrf: cookies.csrf!, sessionId: session.id };
}

async function verify(
  token: string,
  cookies: Cookies = {},
): Promise<request.Response> {
  return post(
    '/auth/email/verify',
    { token },
    { csrf: await anonymousCsrf(), ...cookies },
  );
}

async function sessionUser(sid: string): Promise<unknown> {
  const response = await request(server)
    .get('/auth/session')
    .set('Cookie', cookieHeader({ sid }));
  return (response.body as { user: unknown }).user;
}

async function emailVerifiedAt(userId: string): Promise<Date | null> {
  const [row] = await dataSource.query<{ emailVerifiedAt: Date | null }[]>(
    'SELECT "emailVerifiedAt" FROM "user" WHERE id = $1',
    [userId],
  );
  return row.emailVerifiedAt;
}

describe('confirmação de e-mail', () => {
  it('confirma o e-mail, abre a sessão e devolve o destino do cadastro', async () => {
    const { email, userId, token } = await registerAccount('/grupos/abc');

    const response = await verify(token);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ next: '/grupos/abc' });
    expect(await emailVerifiedAt(userId)).toBeInstanceOf(Date);
    const sid = cookieFrom(response, 'sid');
    expect(sid).toBeDefined();
    expect(await sessionUser(sid!)).toMatchObject({
      id: userId,
      email,
      emailVerified: true,
    });
  });

  it('devolve /grupos como destino quando o cadastro não tinha origem', async () => {
    const { token } = await registerAccount();

    const response = await verify(token);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ next: '/grupos' });
  });

  it('emite user.email_verified', async () => {
    const { email, userId, token } = await registerAccount();
    const output: string[] = [];
    Logger.overrideLogger(new AppLogger('production'));
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
      output.push(String(chunk));
      return true;
    });
    try {
      await verify(token);
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
      userId,
    });
    expect(JSON.stringify(events[0])).not.toContain(email);
  });

  it('responde 410 a link vencido', async () => {
    const { userId, token } = await registerAccount();
    await dataSource.query(
      `UPDATE auth_token SET "expiresAt" = now() - interval '1 second' WHERE "userId" = $1`,
      [userId],
    );

    const response = await verify(token);

    expect(response.status).toBe(410);
    expect(response.body).toEqual(GONE);
    expect(await emailVerifiedAt(userId)).toBeNull();
    expect(cookieFrom(response, 'sid')).toBeUndefined();
  });

  it('responde 410 a link usado', async () => {
    const { token } = await registerAccount();
    expect((await verify(token)).status).toBe(200);

    const response = await verify(token);

    expect(response.status).toBe(410);
    expect(response.body).toEqual(GONE);
    expect(cookieFrom(response, 'sid')).toBeUndefined();
  });

  it('responde 410 a link substituído por um reenvio', async () => {
    const { email, userId, token } = await registerAccount();
    const session = await openSession(userId);
    expect(
      (await post('/auth/email/verification-link', {}, session)).status,
    ).toBe(202);
    const [, newer] = await confirmationTokens(email);

    const response = await verify(token);

    expect(response.status).toBe(410);
    expect(response.body).toEqual(GONE);
    expect((await verify(newer)).status).toBe(200);
  });

  it('responde 410 ao link de quem já confirmou por outro caminho', async () => {
    const { userId, token } = await registerAccount();
    await dataSource.query(
      'UPDATE "user" SET "emailVerifiedAt" = now() WHERE id = $1',
      [userId],
    );

    const response = await verify(token);

    expect(response.status).toBe(410);
    expect(response.body).toEqual(GONE);
    expect(cookieFrom(response, 'sid')).toBeUndefined();
  });

  it('reenvio invalida o link anterior e enfileira um novo', async () => {
    const { email, userId, token } = await registerAccount('/grupos/xyz');
    const session = await openSession(userId);

    const response = await post('/auth/email/verification-link', {}, session);

    expect(response.status).toBe(202);
    expect(response.body).toEqual({ email });
    const tokens = await confirmationTokens(email);
    expect(tokens).toHaveLength(2);
    expect(tokens[1]).not.toBe(token);
    expect((await verify(token)).status).toBe(410);
    const confirmed = await verify(tokens[1]);
    expect(confirmed.status).toBe(200);
    expect(confirmed.body).toEqual({ next: '/grupos/xyz' });
  });

  it('reenvio exige sessão', async () => {
    const { email } = await registerAccount();

    const response = await post(
      '/auth/email/verification-link',
      {},
      { csrf: await anonymousCsrf() },
    );

    expect(response.status).toBe(401);
    expect(await confirmationTokens(email)).toHaveLength(1);
  });

  it('responde 429 no 6º reenvio em 1 hora', async () => {
    const { email, userId } = await registerAccount();
    const session = await openSession(userId);
    const statuses = [];
    for (let attempt = 1; attempt <= 5; attempt++) {
      statuses.push(
        (await post('/auth/email/verification-link', {}, session)).status,
      );
    }

    const sixth = await post('/auth/email/verification-link', {}, session);

    expect(statuses).toEqual([202, 202, 202, 202, 202]);
    expect(sixth.status).toBe(429);
    expect(sixth.body).toMatchObject({
      statusCode: 429,
      message: 'Muitas tentativas. Tente de novo em 60 minutos.',
    });
    expect(await confirmationTokens(email)).toHaveLength(6);
  });

  it('responde 429 no 21º pedido do mesmo IP em 1 hora', async () => {
    const ip = newIp();
    const statuses = [];
    for (let attempt = 1; attempt <= 20; attempt++) {
      const { userId } = await registerAccount();
      const session = await openSession(userId);
      statuses.push(
        (await post('/auth/email/verification-link', {}, session, ip)).status,
      );
    }
    const { email, userId } = await registerAccount();
    const session = await openSession(userId);

    const last = await post('/auth/email/verification-link', {}, session, ip);

    expect(statuses).toEqual(Array.from({ length: 20 }, () => 202));
    expect(last.status).toBe(429);
    expect(await confirmationTokens(email)).toHaveLength(1);
  });

  it('encerra a sessão que o navegador já tinha ao confirmar', async () => {
    const other = await registerAccount();
    const previous = await openSession(other.userId);
    const { userId, token } = await registerAccount();

    const response = await verify(token, previous);

    expect(response.status).toBe(200);
    const [row] = await dataSource.query<{ count: number }[]>(
      'SELECT count(*)::int AS count FROM session WHERE id = $1',
      [previous.sessionId],
    );
    expect(row.count).toBe(0);
    expect(await sessionUser(previous.sid)).toBeNull();
    expect(await sessionUser(cookieFrom(response, 'sid')!)).toMatchObject({
      id: userId,
    });
  });

  it('reenvio responde 409 "Seu e-mail já está confirmado." a quem já confirmou', async () => {
    const { email, token } = await registerAccount();
    const confirmed = await verify(token);
    const session = {
      sid: cookieFrom(confirmed, 'sid')!,
      csrf: cookieFrom(confirmed, 'csrf')!,
    };

    const response = await post('/auth/email/verification-link', {}, session);

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      statusCode: 409,
      message: 'Seu e-mail já está confirmado.',
      error: 'Conflict',
    });
    expect(await confirmationTokens(email)).toHaveLength(1);
  });
});
