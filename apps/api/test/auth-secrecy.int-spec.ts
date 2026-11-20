import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as Sentry from '@sentry/nestjs';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { DataSource } from 'typeorm';
import { configureApp } from '../src/app.setup.js';
import { AppLogger } from '../src/observability/app-logger.js';
import { stubAccountEnv } from './account-env.js';
import { createIsolatedDatabase } from './isolated-database.js';

// Marcas únicas nas senhas: se aparecerem num registro, ele vazou a senha.
const MARK = randomUUID().slice(0, 8);
const PASSWORD = `Senha-${MARK}-cadastro`;
const NEW_PASSWORD = `Senha-${MARK}-redefinida`;
const EMAIL = `ana.${MARK}@exemplo.com`;

type Cookies = { sid?: string; csrf?: string };

describe('sigilo da conta', () => {
  const output: string[] = [];
  const envelopes: string[] = [];
  // Respostas de todas as rotas da conta chamadas no fluxo.
  const responses: request.Response[] = [];
  // Valores que nunca podem aparecer em log, Sentry ou corpo de resposta.
  const secrets: string[] = [PASSWORD, NEW_PASSWORD];
  let badRequests: request.Response[] = [];
  let app: INestApplication;
  let server: App;
  let dataSource: DataSource;

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

  // Guarda os cookies de sessão e CSRF emitidos como segredos do fluxo.
  function keep(response: request.Response): request.Response {
    responses.push(response);
    for (const name of ['sid', 'csrf']) {
      const value = cookieValue(response, name);
      if (value) secrets.push(value);
    }
    return response;
  }

  async function anonymousCsrf(): Promise<string> {
    return cookieValue(
      keep(await request(server).get('/auth/session')),
      'csrf',
    )!;
  }

  async function post(
    path: string,
    body: object,
    cookies?: Cookies,
  ): Promise<request.Response> {
    const sent = cookies ?? { csrf: await anonymousCsrf() };
    return keep(
      await request(server)
        .post(path)
        .set('Cookie', cookieHeader(sent))
        .set('X-CSRF-Token', sent.csrf ?? '')
        .send(body),
    );
  }

  async function lastLinkToken(subject: string): Promise<string> {
    const [job] = await dataSource.query<
      { payload: { blocks: { type: string; url?: string }[] } }[]
    >(
      `SELECT payload FROM job
       WHERE type = 'email.send' AND payload->>'to' = $1
         AND payload->>'subject' = $2
       ORDER BY "createdAt" DESC, id DESC LIMIT 1`,
      [EMAIL, subject],
    );
    const button = job.payload.blocks.find((block) => block.type === 'button');
    const token = new URL(button!.url!).searchParams.get('token')!;
    secrets.push(token);
    return token;
  }

  function sessionCookies(response: request.Response): Required<Cookies> {
    return {
      sid: cookieValue(response, 'sid')!,
      csrf: cookieValue(response, 'csrf')!,
    };
  }

  beforeAll(async () => {
    const capture = (chunk: unknown) => {
      output.push(String(chunk));
      return true;
    };
    vi.spyOn(process.stdout, 'write').mockImplementation(capture);
    vi.spyOn(process.stderr, 'write').mockImplementation(capture);
    // O ConfigModule valida o ambiente quando o módulo é importado.
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('DATABASE_URL', await createIsolatedDatabase('auth_secrecy'));
    vi.stubEnv('RESEND_API_KEY', 're_test_key');
    vi.stubEnv('EMAIL_FROM', 'Amigo Secreto <nao-responda@amigo.example>');
    vi.stubEnv('SENTRY_DSN', 'https://public@sentry.example.com/1');
    stubAccountEnv();
    // A configuração real do Sentry; o envelope é o que sairia para a rede.
    await import('../src/instrument.js');
    Sentry.getClient()!.on('beforeEnvelope', (envelope) => {
      envelopes.push(JSON.stringify(envelope));
    });
    const { AuthFixtureModule } =
      await import('./fixtures/auth-fixture.module.js');
    app = await NestFactory.create(AuthFixtureModule, {
      logger: new AppLogger('production'),
    });
    configureApp(app);
    await app.init();
    server = app.getHttpServer() as App;
    dataSource = app.get(DataSource);

    // Cadastro, confirmação, login, recuperação e logout.
    expect(
      (
        await post('/auth/register', {
          name: 'Ana Souza',
          email: EMAIL,
          password: PASSWORD,
          acceptTerms: true,
        })
      ).status,
    ).toBe(202);
    const verified = await post('/auth/email/verify', {
      token: await lastLinkToken('Confirme seu e-mail no Amigo Secreto'),
    });
    expect(verified.status).toBe(200);
    expect(
      (await post('/auth/login', { email: EMAIL, password: 'errada-123' }))
        .status,
    ).toBe(401);
    const loggedIn = await post('/auth/login', {
      email: EMAIL,
      password: PASSWORD,
    });
    expect(loggedIn.status).toBe(200);
    expect((await post('/auth/password/forgot', { email: EMAIL })).status).toBe(
      202,
    );
    const resetToken = await lastLinkToken(
      'Redefina sua senha do Amigo Secreto',
    );
    const reset = await post('/auth/password/reset', {
      token: resetToken,
      password: NEW_PASSWORD,
    });
    expect(reset.status).toBe(200);
    const session = sessionCookies(reset);

    // Um 500 numa rota com sessão, com a senha no corpo e os cookies.
    const failure = await post(
      '/fixtures/auth/failure',
      { password: NEW_PASSWORD },
      session,
    );
    expect(failure.status).toBe(500);
    expect((await post('/auth/logout', {}, session)).status).toBe(204);

    // Pedidos recusados pela validação, com senha e token no corpo.
    badRequests = [
      await post('/auth/register', {
        name: 'Ana Souza',
        email: 'invalido@',
        password: NEW_PASSWORD,
        acceptTerms: true,
      }),
      await post('/auth/login', {
        email: EMAIL,
        password: 'x'.repeat(129) + MARK,
      }),
      await post('/auth/password/reset', {
        token: resetToken,
        password: MARK.slice(0, 7),
      }),
      await post('/auth/register', {
        email: EMAIL,
        password: PASSWORD,
        acceptTerms: true,
        extra: PASSWORD,
      }),
    ];
    secrets.push('x'.repeat(129) + MARK);
    await Sentry.flush(2000);
  });

  afterAll(async () => {
    await app.close();
    await Sentry.close();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  const leaked = (records: string) =>
    secrets.filter((secret) => records.includes(secret));

  it('não escreve senha, token de sessão, token de link nem cookie no log', () => {
    const logs = output.join('');

    // Os registros existem: os eventos da conta e o erro do 500.
    expect(logs).toContain('"event":"user.registered"');
    expect(logs).toContain('"event":"user.email_verified"');
    expect(logs).toContain('Falha forçada na rota da conta');
    expect(leaked(logs)).toEqual([]);
    expect(logs).not.toMatch(/sid=|csrf=|x-csrf-token/i);
  });

  it('não manda senha, token nem cookie ao Sentry num erro 500', () => {
    const sent = envelopes.join('\n');
    // Além do evento, o SDK manda client_report com contagens de descarte.
    const events = envelopes.filter((envelope) =>
      envelope.includes('"type":"event"'),
    );

    expect(events).toHaveLength(1);
    expect(sent).toContain('Falha forçada na rota da conta');
    expect(leaked(sent)).toEqual([]);
    expect(sent).not.toMatch(/sid=|csrf=|x-csrf-token/i);
  });

  it('não devolve hash de senha nem de token nas respostas da conta', async () => {
    const hashes = (
      await dataSource.query<{ hash: string }[]>(
        `SELECT "passwordHash" AS hash FROM "user" WHERE email = $1
         UNION ALL SELECT "tokenHash" FROM session
         UNION ALL SELECT "tokenHash" FROM auth_token`,
        [EMAIL],
      )
    ).map((row) => row.hash);
    const bodies = responses.map((response) => response.text).join('\n');

    expect(hashes.length).toBeGreaterThan(2);
    expect(hashes.filter((hash) => bodies.includes(hash))).toEqual([]);
    expect(bodies).not.toMatch(/passwordHash|tokenHash|\$argon2id/);
  });

  it('não devolve senha nem token nas respostas de erro 400', () => {
    const bodies = badRequests.map((response) => response.text).join('\n');

    expect(badRequests.map((response) => response.status)).toEqual([
      400, 400, 400, 400,
    ]);
    expect(leaked(bodies)).toEqual([]);
    expect(bodies).not.toContain(MARK);
  });
});
