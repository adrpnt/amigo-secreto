import { createHash, randomUUID } from 'node:crypto';
import { type INestApplication, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { DataSource } from 'typeorm';
import type { CookieResponse } from '../src/auth/cookies.js';
import type { SessionsService } from '../src/auth/sessions.service.js';
import { AppLogger } from '../src/observability/app-logger.js';
import { startFakeGoogle, type FakeGoogle } from './fake-google.js';
import { createIsolatedDatabase } from './isolated-database.js';

const CLIENT_ID = 'cliente-google-teste';
const CLIENT_SECRET = 'segredo-google-teste';
const LINKED_SUBJECT = 'Conta Google vinculada ao Amigo Secreto';

type Cookies = Record<string, string | undefined>;

let google: FakeGoogle;
let app: INestApplication;
let appWithoutGoogle: INestApplication;
let server: App;
let dataSource: DataSource;
let sessions: SessionsService;

// O ConfigModule valida o ambiente quando o módulo é avaliado, então cada
// configuração do Google sobe com os módulos da API recarregados.
async function startApp(withGoogle: boolean): Promise<INestApplication> {
  vi.stubEnv('GOOGLE_CLIENT_ID', withGoogle ? CLIENT_ID : '');
  vi.stubEnv('GOOGLE_CLIENT_SECRET', withGoogle ? CLIENT_SECRET : '');
  vi.resetModules();
  const { AuthFixtureModule } =
    await import('./fixtures/auth-fixture.module.js');
  const { configureApp } = await import('../src/app.setup.js');
  const started = await NestFactory.create(AuthFixtureModule, {
    logger: false,
  });
  configureApp(started);
  await started.init();
  return started;
}

beforeAll(async () => {
  google = await startFakeGoogle(CLIENT_ID);
  vi.stubEnv('DATABASE_URL', await createIsolatedDatabase('google_login'));
  vi.stubEnv('NODE_ENV', 'test');
  vi.stubEnv('GOOGLE_AUTH_URL', google.authUrl);
  vi.stubEnv('GOOGLE_TOKEN_URL', google.tokenUrl);
  appWithoutGoogle = await startApp(false);
  app = await startApp(true);
  server = app.getHttpServer() as App;
  dataSource = app.get(DataSource);
  // A classe do último carregamento, o mesmo do app com Google.
  const { SessionsService: Sessions } =
    await import('../src/auth/sessions.service.js');
  sessions = app.get(Sessions);
});

afterAll(async () => {
  await app.close();
  await appWithoutGoogle.close();
  await google.close();
  vi.unstubAllEnvs();
});

beforeEach(() => {
  google.reset();
});

function setCookies(response: request.Response): string[] {
  return (response.headers['set-cookie'] as unknown as string[]) ?? [];
}

function setCookie(
  response: request.Response,
  name: string,
): string | undefined {
  return setCookies(response).find((c) => c.startsWith(`${name}=`));
}

function cookieValue(
  response: request.Response,
  name: string,
): string | undefined {
  const cookie = setCookie(response, name);
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

// Conteúdo de um cookie assinado (g_oauth, g_signup), sem conferir a assinatura.
function signedData(value: string): Record<string, unknown> {
  const [encoded] = value.split('.');
  return (
    JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as {
      data: Record<string, unknown>;
    }
  ).data;
}

type Account = { id: string; email: string };

async function createAccount(
  options: {
    googleId?: string | null;
    verified?: boolean;
    avatarUrl?: string | null;
  } = {},
): Promise<Account> {
  const email = `${randomUUID()}@exemplo.com`;
  const [row] = await dataSource.query<{ id: string }[]>(
    `INSERT INTO "user" (name, email, "passwordHash", "googleId", "avatarUrl", "emailVerifiedAt", "termsVersion", "termsAcceptedAt")
     VALUES ('Ana Souza', $1, $2, $3, $4, $5, '2026-11-19', now()) RETURNING id`,
    [
      email,
      options.googleId ? null : 'hash-qualquer',
      options.googleId ?? null,
      options.avatarUrl ?? null,
      options.verified ? new Date() : null,
    ],
  );
  return { id: row.id, email };
}

async function storedUser(id: string): Promise<{
  googleId: string | null;
  avatarUrl: string | null;
  emailVerifiedAt: Date | null;
}> {
  const [row] = await dataSource.query<
    {
      googleId: string | null;
      avatarUrl: string | null;
      emailVerifiedAt: Date | null;
    }[]
  >(
    'SELECT "googleId", "avatarUrl", "emailVerifiedAt" FROM "user" WHERE id = $1',
    [id],
  );
  return row;
}

async function usersWithEmail(email: string): Promise<number> {
  const [row] = await dataSource.query<{ count: string }[]>(
    'SELECT count(*) FROM "user" WHERE email = $1',
    [email],
  );
  return Number(row.count);
}

async function emailSubjectsTo(email: string): Promise<string[]> {
  const rows = await dataSource.query<{ subject: string }[]>(
    `SELECT payload->>'subject' AS subject FROM job
     WHERE type = 'email.send' AND payload->>'to' = $1`,
    [email],
  );
  return rows.map((row) => row.subject);
}

async function sessionUserId(sid: string | undefined): Promise<unknown> {
  const response = await request(server)
    .get('/auth/session')
    .set('Cookie', cookieHeader({ sid }));
  return (response.body as { user: { id: string } | null }).user?.id ?? null;
}

function capture(cookies: Cookies): CookieResponse {
  return {
    cookie: (name, value) => {
      cookies[name] = value;
    },
    clearCookie: () => undefined,
  };
}

async function start(next?: string): Promise<request.Response> {
  return request(server)
    .get('/auth/google/start')
    .query(next === undefined ? {} : { next });
}

// Começa o login e volta do Google com o code e o state do início.
async function loginWithGoogle(
  claims: Record<string, unknown>,
  options: { next?: string; cookies?: Cookies; status?: number } = {},
): Promise<request.Response> {
  google.replyWith({ claims, status: options.status });
  const started = await start(options.next);
  const state = new URL(started.headers.location).searchParams.get('state')!;
  return request(server)
    .get('/auth/google/callback')
    .query({ code: 'code-do-google', state })
    .set(
      'Cookie',
      cookieHeader({
        ...options.cookies,
        g_oauth: cookieValue(started, 'g_oauth'),
      }),
    );
}

function googleClaims(
  email: string,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return { sub: `sub-${randomUUID()}`, email, ...overrides };
}

describe('login com Google', () => {
  it('start redireciona ao Google e grava o cookie g_oauth com state, verifier e destino', async () => {
    const response = await start('/convite/abc');

    expect(response.status).toBe(302);
    const location = new URL(response.headers.location);
    expect(`${location.origin}${location.pathname}`).toBe(google.authUrl);
    const oauth = signedData(cookieValue(response, 'g_oauth')!);
    expect(oauth).toEqual({
      state: location.searchParams.get('state'),
      verifier: expect.any(String) as string,
      next: '/convite/abc',
    });
    expect(location.searchParams.get('code_challenge')).toBe(
      createHash('sha256')
        .update(oauth.verifier as string)
        .digest('base64url'),
    );
    expect(location.searchParams.get('code_challenge_method')).toBe('S256');
    const cookie = setCookie(response, 'g_oauth')!;
    expect(cookie).toContain('Path=/api/auth/google');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Max-Age=600');
  });

  it('start responde 404 sem Google configurado', async () => {
    const response = await request(appWithoutGoogle.getHttpServer() as App).get(
      '/auth/google/start',
    );

    expect(response.status).toBe(404);
    expect(setCookie(response, 'g_oauth')).toBeUndefined();
  });

  it('GET /auth/session informa googleEnabled false sem GOOGLE_CLIENT_ID fora de production', async () => {
    const without = await request(appWithoutGoogle.getHttpServer() as App).get(
      '/auth/session',
    );
    const withGoogle = await request(server).get('/auth/session');

    expect(without.body).toMatchObject({ user: null, googleEnabled: false });
    expect(withGoogle.body).toMatchObject({ user: null, googleEnabled: true });
  });

  it('abre a sessão da conta já vinculada e leva ao destino', async () => {
    const googleId = `sub-${randomUUID()}`;
    const account = await createAccount({ googleId, verified: true });

    const response = await loginWithGoogle(
      googleClaims(account.email, { sub: googleId }),
      { next: '/convite/abc' },
    );

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/convite/abc');
    expect(await sessionUserId(cookieValue(response, 'sid'))).toBe(account.id);
  });

  it('vincula a conta com senha de e-mail verificado, confirma o e-mail, abre a sessão e enfileira o aviso de Google vinculado', async () => {
    const account = await createAccount({ verified: false });
    const claims = googleClaims(`  ${account.email.toUpperCase()} `, {
      picture: 'https://lh3.googleusercontent.com/a/vinculo',
    });
    const output: string[] = [];
    Logger.overrideLogger(new AppLogger('production'));
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
      output.push(String(chunk));
      return true;
    });
    let response: request.Response;
    try {
      response = await loginWithGoogle(claims, { next: '/convite/abc' });
    } finally {
      vi.restoreAllMocks();
      // O app do teste sobe com logger: false.
      Logger.overrideLogger(false);
    }

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/convite/abc');
    const stored = await storedUser(account.id);
    expect(stored.googleId).toBe(claims.sub);
    expect(stored.emailVerifiedAt).toBeInstanceOf(Date);
    expect(stored.avatarUrl).toBe(
      'https://lh3.googleusercontent.com/a/vinculo',
    );
    expect(await sessionUserId(cookieValue(response, 'sid'))).toBe(account.id);
    expect(await emailSubjectsTo(account.email)).toEqual([LINKED_SUBJECT]);
    const events = output
      .flatMap((chunk) => chunk.split('\n'))
      .filter((line) => line.startsWith('{'))
      .map((line) => JSON.parse(line) as Record<string, unknown>)
      .filter((record) => record.event === 'user.email_verified');
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ userId: account.id });
  });

  it('leva e-mail verificado sem conta a /completar-cadastro com o cookie g_signup', async () => {
    const email = `${randomUUID()}@exemplo.com`;
    const claims = googleClaims(email, {
      name: 'Bia Lima',
      picture: 'https://lh3.googleusercontent.com/a/bia',
    });

    const response = await loginWithGoogle(claims, { next: '/convite/abc' });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/completar-cadastro');
    expect(signedData(cookieValue(response, 'g_signup')!)).toEqual({
      sub: claims.sub,
      email,
      name: 'Bia Lima',
      picture: 'https://lh3.googleusercontent.com/a/bia',
      next: '/convite/abc',
    });
    const cookie = setCookie(response, 'g_signup')!;
    expect(cookie).toContain('Path=/;');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Max-Age=900');
    expect(cookieValue(response, 'sid')).toBeUndefined();
    expect(await usersWithEmail(email)).toBe(0);
  });

  it('recusa e-mail não verificado com erro=google_nao_verificado sem criar, vincular nem abrir sessão', async () => {
    const account = await createAccount({ verified: true });
    const newEmail = `${randomUUID()}@exemplo.com`;

    const withAccount = await loginWithGoogle(
      googleClaims(account.email, { email_verified: false }),
      { next: '/convite/abc' },
    );
    const withoutAccount = await loginWithGoogle(
      googleClaims(newEmail, { email_verified: false }),
    );

    expect(withAccount.status).toBe(302);
    expect(withAccount.headers.location).toBe(
      '/entrar?erro=google_nao_verificado&next=%2Fconvite%2Fabc',
    );
    expect(withoutAccount.headers.location).toBe(
      '/entrar?erro=google_nao_verificado&next=%2Fgrupos',
    );
    for (const response of [withAccount, withoutAccount]) {
      expect(cookieValue(response, 'sid')).toBeUndefined();
      expect(cookieValue(response, 'g_signup')).toBeUndefined();
    }
    expect((await storedUser(account.id)).googleId).toBeNull();
    expect(await usersWithEmail(newEmail)).toBe(0);
  });

  it('volta a /entrar com erro=google quando o state difere do cookie', async () => {
    const started = await start('/convite/abc');

    const response = await request(server)
      .get('/auth/google/callback')
      .query({ code: 'code-do-google', state: 'outro-state' })
      .set(
        'Cookie',
        cookieHeader({ g_oauth: cookieValue(started, 'g_oauth') }),
      );

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe(
      '/entrar?erro=google&next=%2Fconvite%2Fabc',
    );
    expect(google.requests).toEqual([]);
    expect(cookieValue(response, 'sid')).toBeUndefined();
    expect(setCookie(response, 'g_oauth')).toMatch(/^g_oauth=;/);
  });

  it('volta a /entrar com erro=google quando a pessoa cancela no Google', async () => {
    const started = await start('/convite/abc');
    const state = new URL(started.headers.location).searchParams.get('state')!;

    const response = await request(server)
      .get('/auth/google/callback')
      .query({ error: 'access_denied', state })
      .set(
        'Cookie',
        cookieHeader({ g_oauth: cookieValue(started, 'g_oauth') }),
      );

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe(
      '/entrar?erro=google&next=%2Fconvite%2Fabc',
    );
    expect(google.requests).toEqual([]);
    expect(cookieValue(response, 'sid')).toBeUndefined();
  });

  it('volta a /entrar com erro=google quando o Google recusa o code', async () => {
    const account = await createAccount({ verified: true });

    const response = await loginWithGoogle(googleClaims(account.email), {
      next: '/convite/abc',
      status: 400,
    });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe(
      '/entrar?erro=google&next=%2Fconvite%2Fabc',
    );
    expect(google.requests).toHaveLength(1);
    expect(cookieValue(response, 'sid')).toBeUndefined();
    expect((await storedUser(account.id)).googleId).toBeNull();
  });

  it('atualiza a foto da conta vinculada a cada login', async () => {
    const googleId = `sub-${randomUUID()}`;
    const account = await createAccount({
      googleId,
      verified: true,
      avatarUrl: 'https://lh3.googleusercontent.com/a/antiga',
    });

    await loginWithGoogle(
      googleClaims(account.email, {
        sub: googleId,
        picture: 'https://lh3.googleusercontent.com/a/nova',
      }),
    );
    const afterFirst = (await storedUser(account.id)).avatarUrl;
    await loginWithGoogle(
      googleClaims(account.email, {
        sub: googleId,
        picture: 'https://lh3.googleusercontent.com/a/mais-nova',
      }),
    );

    expect(afterFirst).toBe('https://lh3.googleusercontent.com/a/nova');
    expect((await storedUser(account.id)).avatarUrl).toBe(
      'https://lh3.googleusercontent.com/a/mais-nova',
    );
  });

  it('troca por /grupos um destino de outro site', async () => {
    const googleId = `sub-${randomUUID()}`;
    const account = await createAccount({ googleId, verified: true });

    const response = await loginWithGoogle(
      googleClaims(account.email, { sub: googleId }),
      { next: 'https://golpe.example.com/entrar' },
    );

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/grupos');
    expect(await sessionUserId(cookieValue(response, 'sid'))).toBe(account.id);
  });

  it('recusa o e-mail de conta vinculada a outro Google com erro=google sem trocar o vínculo', async () => {
    const account = await createAccount({
      googleId: `sub-${randomUUID()}`,
      verified: true,
    });
    const before = (await storedUser(account.id)).googleId;

    const response = await loginWithGoogle(googleClaims(account.email), {
      next: '/convite/abc',
    });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe(
      '/entrar?erro=google&next=%2Fconvite%2Fabc',
    );
    expect(cookieValue(response, 'sid')).toBeUndefined();
    expect((await storedUser(account.id)).googleId).toBe(before);
    expect(await emailSubjectsTo(account.email)).toEqual([]);
  });

  it('encerra a sessão que o navegador já tinha ao entrar com Google', async () => {
    const other = await createAccount({ verified: true });
    const browser: Cookies = {};
    await sessions.create(other.id, capture(browser));
    const googleId = `sub-${randomUUID()}`;
    const account = await createAccount({ googleId, verified: true });

    const response = await loginWithGoogle(
      googleClaims(account.email, { sub: googleId }),
      { cookies: { sid: browser.sid } },
    );

    expect(response.status).toBe(302);
    expect(await sessionUserId(browser.sid)).toBeNull();
    expect(await sessionUserId(cookieValue(response, 'sid'))).toBe(account.id);
  });
});
