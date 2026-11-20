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

const FORBIDDEN = {
  statusCode: 403,
  message: 'Recarregue a página e tente de novo.',
  error: 'Forbidden',
};
const THIRTY_DAYS_S = 30 * 24 * 60 * 60;

type Cookies = { sid?: string; csrf?: string };

let app: INestApplication;
let server: App;
let dataSource: DataSource;
let sessions: SessionsService;

beforeAll(async () => {
  // O ConfigModule valida o ambiente quando o módulo é importado.
  vi.stubEnv('DATABASE_URL', await createIsolatedDatabase('csrf'));
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

function capture(cookies: Cookies): CookieResponse {
  return {
    cookie: (name, value) => {
      if (name === 'sid' || name === 'csrf') cookies[name] = value;
    },
    clearCookie: () => undefined,
  };
}

// Abre uma sessão como o login fará: grava sid e um csrf da sessão nova.
async function openSession(): Promise<
  Required<Cookies> & { sessionId: string }
> {
  const [user] = await dataSource.query<{ id: string }[]>(
    `INSERT INTO "user" (name, email, "termsVersion", "termsAcceptedAt")
     VALUES ('Ana', $1, '2026-11-19', now()) RETURNING id`,
    [`${randomUUID()}@exemplo.com`],
  );
  const cookies: Cookies = {};
  const session = await sessions.create(user.id, capture(cookies));
  return { sid: cookies.sid!, csrf: cookies.csrf!, sessionId: session.id };
}

function cookieHeader(cookies: Cookies): string {
  return Object.entries(cookies)
    .filter(([, value]) => value !== undefined)
    .map(([name, value]) => `${name}=${encodeURIComponent(value)}`)
    .join('; ');
}

function setCookies(response: request.Response): string[] {
  return (response.headers['set-cookie'] as unknown as string[]) ?? [];
}

function csrfFrom(response: request.Response): string | undefined {
  const cookie = setCookies(response).find((c) => c.startsWith('csrf='));
  return cookie
    ? decodeURIComponent(cookie.slice('csrf='.length).split(';')[0])
    : undefined;
}

function send(
  method: 'post' | 'put' | 'patch' | 'delete',
  path: string,
  cookies: Cookies,
  header?: string,
) {
  const call = request(server)
    [method](path)
    .set('Cookie', cookieHeader(cookies));
  return header === undefined ? call : call.set('X-CSRF-Token', header);
}

describe('proteção CSRF', () => {
  it('responde 403 a POST sem X-CSRF-Token', async () => {
    const session = await openSession();

    const response = await send('post', '/fixtures/auth/mutation', session);

    expect(response.status).toBe(403);
    expect(response.body).toEqual(FORBIDDEN);
  });

  it('responde 403 quando o cabeçalho difere do cookie', async () => {
    const session = await openSession();
    const other: Cookies = {};
    sessions.issueCsrf(capture(other), session.sessionId);

    const response = await send(
      'post',
      '/fixtures/auth/mutation',
      session,
      other.csrf,
    );

    expect(other.csrf).not.toBe(session.csrf);
    expect(response.status).toBe(403);
    expect(response.body).toEqual(FORBIDDEN);
  });

  it('responde 403 a token emitido para outra sessão', async () => {
    const mine = await openSession();
    const someoneElse = await openSession();
    const anonymous: Cookies = {};
    sessions.issueCsrf(capture(anonymous), null);

    for (const csrf of [someoneElse.csrf, anonymous.csrf!]) {
      const response = await send(
        'post',
        '/fixtures/auth/mutation',
        { sid: mine.sid, csrf },
        csrf,
      );

      expect(response.status).toBe(403);
      expect(response.body).toEqual(FORBIDDEN);
    }
    // Ao encerrar a sessão, o token passa a ser o de quem não tem sessão.
    const afterLogout: Cookies = {};
    await sessions.revoke(mine.sessionId, capture(afterLogout));
    const anonymousPost = await send(
      'post',
      '/fixtures/auth/public-mutation',
      afterLogout,
      afterLogout.csrf,
    );
    expect(anonymousPost.status).toBe(201);
    const oldToken = await send(
      'post',
      '/fixtures/auth/public-mutation',
      { csrf: mine.csrf },
      mine.csrf,
    );
    expect(oldToken.status).toBe(403);
  });

  it('aceita POST com o token da sessão atual', async () => {
    const session = await openSession();

    const response = await send(
      'post',
      '/fixtures/auth/mutation',
      session,
      session.csrf,
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
    // Sem sessão, vale o token emitido para a ausência dela.
    const anonymous: Cookies = {};
    sessions.issueCsrf(capture(anonymous), null);
    const anonymousPost = await send(
      'post',
      '/fixtures/auth/public-mutation',
      anonymous,
      anonymous.csrf,
    );
    expect(anonymousPost.status).toBe(201);
  });

  it('exige o token em PUT, PATCH e DELETE', async () => {
    const session = await openSession();

    for (const method of ['put', 'patch', 'delete'] as const) {
      const without = await send(method, '/fixtures/auth/mutation', session);
      const wrong = await send(
        method,
        '/fixtures/auth/mutation',
        session,
        `${session.csrf}x`,
      );
      const valid = await send(
        method,
        '/fixtures/auth/mutation',
        session,
        session.csrf,
      );

      expect(without.status).toBe(403);
      expect(without.body).toEqual(FORBIDDEN);
      expect(wrong.status).toBe(403);
      expect(valid.status).toBe(200);
    }
  });

  it('não exige o token em GET', async () => {
    const session = await openSession();

    const response = await request(server)
      .get('/fixtures/auth/mutation')
      .set('Cookie', cookieHeader({ sid: session.sid }));

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });
});

describe('GET /auth/session', () => {
  it('grava o cookie csrf legível pelo site', async () => {
    const session = await openSession();

    const response = await request(server)
      .get('/auth/session')
      .set('Cookie', cookieHeader({ sid: session.sid }));

    const cookie = setCookies(response).find((c) => c.startsWith('csrf='));
    expect(cookie).toBeDefined();
    const attributes = cookie!.split(/;\s*/).slice(1);
    expect(attributes).toEqual(
      expect.arrayContaining([
        'Path=/',
        'SameSite=Lax',
        `Max-Age=${THIRTY_DAYS_S}`,
      ]),
    );
    expect(attributes).not.toContain('HttpOnly');
    const csrf = csrfFrom(response)!;
    const accepted = await send(
      'post',
      '/fixtures/auth/mutation',
      { sid: session.sid, csrf },
      csrf,
    );
    expect(accepted.status).toBe(200);

    // Com um csrf que já vale para a sessão, o cookie fica como está.
    const again = await request(server)
      .get('/auth/session')
      .set('Cookie', cookieHeader({ sid: session.sid, csrf }));
    expect(csrfFrom(again)).toBeUndefined();
    // Sem sessão, emite um token para a ausência dela.
    const anonymous = await request(server).get('/auth/session');
    const anonymousCsrf = csrfFrom(anonymous)!;
    const anonymousPost = await send(
      'post',
      '/fixtures/auth/public-mutation',
      { csrf: anonymousCsrf },
      anonymousCsrf,
    );
    expect(anonymousPost.status).toBe(201);
  });
});
