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

const PASSWORD = 'senha-atual-123';
const NEW_EMAIL_SUBJECT = 'Confirme seu novo e-mail no Amigo Secreto';
const NOTICE_SUBJECT = 'Pedido de troca de e-mail no Amigo Secreto';
const DAY_MS = 24 * 60 * 60 * 1000;
const GONE = {
  statusCode: 410,
  message: 'Este link expirou ou já foi usado.',
  error: 'Gone',
};

type Cookies = { sid?: string; csrf: string };

let app: INestApplication;
let server: App;
let dataSource: DataSource;
let sessions: SessionsService;
let passwordHash: string;

beforeAll(async () => {
  // O ConfigModule valida o ambiente quando o módulo é importado.
  vi.stubEnv('DATABASE_URL', await createIsolatedDatabase('email_change'));
  const { AuthFixtureModule } =
    await import('./fixtures/auth-fixture.module.js');
  app = await NestFactory.create(AuthFixtureModule, { logger: false });
  configureApp(app);
  await app.init();
  server = app.getHttpServer() as App;
  dataSource = app.get(DataSource);
  sessions = app.get(SessionsService);
  passwordHash = await new PasswordHasher().hash(PASSWORD);
});

afterAll(async () => {
  await app.close();
  vi.unstubAllEnvs();
});

type Account = { id: string; email: string; cookies: Cookies };

const newAddress = () => `${randomUUID()}@exemplo.com`;

async function createAccount(
  options: { googleOnly?: boolean; verified?: boolean } = {},
): Promise<Account> {
  const email = newAddress();
  const [row] = await dataSource.query<{ id: string }[]>(
    `INSERT INTO "user" (name, email, "passwordHash", "googleId", "emailVerifiedAt", "termsVersion", "termsAcceptedAt")
     VALUES ('Ana Souza', $1, $2, $3, $4, '2026-11-19', now()) RETURNING id`,
    [
      email,
      options.googleOnly ? null : passwordHash,
      options.googleOnly ? `sub-${randomUUID()}` : null,
      (options.verified ?? true) ? new Date() : null,
    ],
  );
  const cookies: Partial<Cookies> = {};
  const response: CookieResponse = {
    cookie: (name, value) => {
      if (name === 'sid' || name === 'csrf') cookies[name] = value;
    },
    clearCookie: () => undefined,
  };
  await sessions.create(row.id, response);
  return { id: row.id, email, cookies: cookies as Cookies };
}

function cookieHeader(cookies: Cookies): string {
  return Object.entries(cookies)
    .filter(([, value]) => value !== undefined)
    .map(([name, value]) => `${name}=${encodeURIComponent(value)}`)
    .join('; ');
}

function post(path: string, cookies: Cookies, body: object): request.Test {
  return request(server)
    .post(path)
    .set('Cookie', cookieHeader(cookies))
    .set('X-CSRF-Token', cookies.csrf)
    .send(body);
}

async function anonymous(): Promise<Cookies> {
  const response = await request(server).get('/auth/session');
  const csrf = (response.headers['set-cookie'] as unknown as string[])
    .find((c) => c.startsWith('csrf='))!
    .slice('csrf='.length)
    .split(';')[0];
  return { csrf: decodeURIComponent(csrf) };
}

function requestChange(
  account: Account,
  body: { newEmail: string; password?: string },
): request.Test {
  return post('/users/me/email', account.cookies, body);
}

// Sem sessão: o link pode ser aberto em outro aparelho.
async function confirm(token: string): Promise<request.Response> {
  return post('/auth/email/change/confirm', await anonymous(), { token });
}

async function login(email: string): Promise<request.Response> {
  return post('/auth/login', await anonymous(), { email, password: PASSWORD });
}

type EmailJob = { subject: string; blocks: { type: string; url?: string }[] };

async function emailJobsTo(email: string): Promise<EmailJob[]> {
  const rows = await dataSource.query<{ payload: EmailJob }[]>(
    `SELECT payload FROM job
     WHERE type = 'email.send' AND payload->>'to' = $1
     ORDER BY "createdAt", id`,
    [email],
  );
  return rows.map((row) => row.payload);
}

async function linkTo(email: string): Promise<URL> {
  const jobs = await emailJobsTo(email);
  const button = jobs.at(-1)!.blocks.find((block) => block.type === 'button')!;
  return new URL(button.url!);
}

async function tokenFor(newEmail: string): Promise<string> {
  return (await linkTo(newEmail)).searchParams.get('token')!;
}

async function storedUser(
  id: string,
): Promise<{ email: string; emailVerifiedAt: Date | null }> {
  const [row] = await dataSource.query<
    { email: string; emailVerifiedAt: Date | null }[]
  >('SELECT email, "emailVerifiedAt" FROM "user" WHERE id = $1', [id]);
  return row;
}

describe('troca de e-mail', () => {
  it('enfileira o link para o e-mail novo e o aviso para o atual e responde com o e-mail novo', async () => {
    const account = await createAccount();
    const newEmail = newAddress();
    const before = Date.now();

    const response = await requestChange(account, {
      newEmail: `  ${newEmail.toUpperCase()} `,
      password: PASSWORD,
    });

    expect(response.status).toBe(202);
    expect(response.body).toEqual({ email: newEmail });
    expect((await emailJobsTo(newEmail)).map((job) => job.subject)).toEqual([
      NEW_EMAIL_SUBJECT,
    ]);
    const link = await linkTo(newEmail);
    expect(`${link.origin}${link.pathname}`).toBe(
      'http://localhost:3000/confirmar-email',
    );
    expect(link.searchParams.get('tipo')).toBe('troca');
    const notice = await emailJobsTo(account.email);
    expect(notice.map((job) => job.subject)).toEqual([NOTICE_SUBJECT]);
    expect(JSON.stringify(notice[0].blocks)).toContain(newEmail);
    const [token] = await dataSource.query<
      { expiresAt: Date; newEmail: string }[]
    >(
      `SELECT "expiresAt", "newEmail" FROM auth_token
       WHERE "userId" = $1 AND type = 'email_change'`,
      [account.id],
    );
    expect(token.newEmail).toBe(newEmail);
    expect(token.expiresAt.getTime()).toBeGreaterThanOrEqual(
      before + 7 * DAY_MS,
    );
    expect(token.expiresAt.getTime()).toBeLessThanOrEqual(
      Date.now() + 7 * DAY_MS,
    );
  });

  it('mantém o e-mail atual para login até a confirmação', async () => {
    const account = await createAccount();
    const newEmail = newAddress();

    await requestChange(account, { newEmail, password: PASSWORD });

    expect((await storedUser(account.id)).email).toBe(account.email);
    expect((await login(account.email)).status).toBe(200);
    expect((await login(newEmail)).status).toBe(401);
  });

  it('troca o e-mail pelo novo, já confirmado, ao confirmar o link', async () => {
    const account = await createAccount({ verified: false });
    const newEmail = newAddress();
    await requestChange(account, { newEmail, password: PASSWORD });

    const response = await confirm(await tokenFor(newEmail));

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ email: newEmail });
    const stored = await storedUser(account.id);
    expect(stored.email).toBe(newEmail);
    expect(stored.emailVerifiedAt).toBeInstanceOf(Date);
    expect((await login(newEmail)).status).toBe(200);
    expect((await login(account.email)).status).toBe(401);
  });

  it('invalida os links de recuperação e de confirmação pendentes ao confirmar a troca', async () => {
    const account = await createAccount({ verified: false });
    await post('/auth/password/forgot', await anonymous(), {
      email: account.email,
    }).expect(202);
    const resetToken = (await linkTo(account.email)).searchParams.get('token')!;
    await post('/auth/email/verification-link', account.cookies, {}).expect(
      202,
    );
    const verificationToken = (await linkTo(account.email)).searchParams.get(
      'token',
    )!;
    const newEmail = newAddress();
    await requestChange(account, { newEmail, password: PASSWORD });

    expect((await confirm(await tokenFor(newEmail))).status).toBe(200);

    const verify = await post('/auth/email/verify', await anonymous(), {
      token: verificationToken,
    });
    const reset = await post('/auth/password/reset', await anonymous(), {
      token: resetToken,
      password: 'senha-nova-456',
    });
    expect([reset.status, verify.status]).toEqual([410, 410]);
    expect((await login(newEmail)).status).toBe(200);
  });

  it('responde 409 "Este e-mail já está em uso por outra conta." quando o e-mail novo ganhou conta', async () => {
    const account = await createAccount();
    const newEmail = newAddress();
    await requestChange(account, { newEmail, password: PASSWORD });
    const token = await tokenFor(newEmail);
    const [other] = await dataSource.query<{ id: string }[]>(
      `INSERT INTO "user" (name, email, "termsVersion", "termsAcceptedAt")
       VALUES ('Outra Pessoa', $1, '2026-11-19', now()) RETURNING id`,
      [newEmail],
    );

    const response = await confirm(token);

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      statusCode: 409,
      message: 'Este e-mail já está em uso por outra conta.',
      error: 'Conflict',
    });
    expect((await storedUser(account.id)).email).toBe(account.email);
    // O link continua sem uso: liberado o e-mail, ele ainda troca.
    await dataSource.query('DELETE FROM "user" WHERE id = $1', [other.id]);
    expect((await confirm(token)).status).toBe(200);
  });

  it('recusa com 400 "Senha atual incorreta." sem enfileirar e-mail', async () => {
    const account = await createAccount();
    const newEmail = newAddress();

    const wrong = await requestChange(account, {
      newEmail,
      password: 'senha-errada-999',
    });
    const absent = await requestChange(account, { newEmail });

    for (const response of [wrong, absent]) {
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        statusCode: 400,
        message: 'Senha atual incorreta.',
        error: 'Bad Request',
      });
    }
    expect(await emailJobsTo(newEmail)).toEqual([]);
    expect(await emailJobsTo(account.email)).toEqual([]);
  });

  it('recusa conta sem senha pedindo para criar uma senha antes', async () => {
    const account = await createAccount({ googleOnly: true });
    const newEmail = newAddress();

    const response = await requestChange(account, { newEmail });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      statusCode: 400,
      message: 'Crie uma senha antes de trocar o e-mail.',
      error: 'Bad Request',
    });
    expect(await emailJobsTo(newEmail)).toEqual([]);
    expect(await emailJobsTo(account.email)).toEqual([]);
  });

  it('responde 410 a link vencido', async () => {
    const account = await createAccount();
    const newEmail = newAddress();
    await requestChange(account, { newEmail, password: PASSWORD });
    await dataSource.query(
      `UPDATE auth_token SET "expiresAt" = now() - interval '1 second'
       WHERE "userId" = $1 AND type = 'email_change'`,
      [account.id],
    );

    const response = await confirm(await tokenFor(newEmail));

    expect(response.status).toBe(410);
    expect(response.body).toEqual(GONE);
    expect((await storedUser(account.id)).email).toBe(account.email);
  });

  it('responde 410 a link usado', async () => {
    const account = await createAccount();
    const newEmail = newAddress();
    await requestChange(account, { newEmail, password: PASSWORD });
    const token = await tokenFor(newEmail);

    const first = await confirm(token);
    const second = await confirm(token);

    expect(first.status).toBe(200);
    expect(second.status).toBe(410);
    expect(second.body).toEqual(GONE);
  });

  it('responde 410 a link substituído por um pedido mais novo', async () => {
    const account = await createAccount();
    const firstEmail = newAddress();
    const secondEmail = newAddress();
    await requestChange(account, { newEmail: firstEmail, password: PASSWORD });
    const firstToken = await tokenFor(firstEmail);
    await requestChange(account, { newEmail: secondEmail, password: PASSWORD });

    const replaced = await confirm(firstToken);
    const newer = await confirm(await tokenFor(secondEmail));

    expect(replaced.status).toBe(410);
    expect(replaced.body).toEqual(GONE);
    expect(newer.status).toBe(200);
    expect((await storedUser(account.id)).email).toBe(secondEmail);
  });

  it('responde 429 no 6º pedido da mesma conta em 1 hora sem enfileirar e-mail', async () => {
    const account = await createAccount();
    const newEmail = newAddress();
    const statuses = [];
    for (let attempt = 1; attempt <= 5; attempt++) {
      statuses.push(
        (
          await requestChange(account, {
            newEmail,
            password: 'senha-errada-999',
          })
        ).status,
      );
    }

    // Com a senha certa: só o limite explica a recusa.
    const sixth = await requestChange(account, {
      newEmail,
      password: PASSWORD,
    });

    expect(statuses).toEqual([400, 400, 400, 400, 400]);
    expect(sixth.status).toBe(429);
    expect(sixth.body).toMatchObject({
      statusCode: 429,
      message: 'Muitas tentativas. Tente de novo em 60 minutos.',
    });
    expect(await emailJobsTo(newEmail)).toEqual([]);
  });
});
