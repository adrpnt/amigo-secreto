import { createHash, randomUUID } from 'node:crypto';
import { TERMS_VERSION } from '@amigo-secreto/shared';
import { type INestApplication, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { DataSource } from 'typeorm';
import { configureApp } from '../src/app.setup.js';
import { PasswordHasher } from '../src/auth/password-hasher.js';
import { AppLogger } from '../src/observability/app-logger.js';
import { createIsolatedDatabase } from './isolated-database.js';

const WEB_URL = 'http://localhost:3000';

type RegisterBody = {
  name?: unknown;
  email?: unknown;
  password?: unknown;
  acceptTerms?: unknown;
  marketingOptIn?: unknown;
  next?: unknown;
};

type UserRow = {
  id: string;
  name: string;
  email: string;
  passwordHash: string | null;
  emailVerifiedAt: Date | null;
  termsVersion: string;
  termsAcceptedAt: Date;
  marketingOptIn: boolean;
  marketingOptInAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type EmailJobRow = {
  payload: {
    to: string;
    subject: string;
    blocks: { type: string; text?: string; label?: string; url?: string }[];
  };
  createdAt: Date;
};

let app: INestApplication;
let server: App;
let dataSource: DataSource;
let ipCounter = 0;

beforeAll(async () => {
  // O ConfigModule valida o ambiente quando o módulo é importado.
  vi.stubEnv('DATABASE_URL', await createIsolatedDatabase('register'));
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
});

afterAll(async () => {
  await app.close();
  vi.unstubAllEnvs();
});

function newIp(): string {
  ipCounter += 1;
  return `10.1.${Math.floor(ipCounter / 256)}.${ipCounter % 256}`;
}

function newEmail(): string {
  return `${randomUUID()}@exemplo.com`;
}

function validBody(overrides: RegisterBody = {}): RegisterBody {
  return {
    name: 'Ana Souza',
    email: newEmail(),
    password: 'senha-forte-123',
    acceptTerms: true,
    marketingOptIn: false,
    ...overrides,
  };
}

function setCookies(response: request.Response): string[] {
  return (response.headers['set-cookie'] as unknown as string[]) ?? [];
}

async function anonymousCsrf(): Promise<string> {
  const response = await request(server).get('/auth/session');
  const cookie = setCookies(response).find((c) => c.startsWith('csrf='));
  return decodeURIComponent(cookie!.slice('csrf='.length).split(';')[0]);
}

async function register(
  body: RegisterBody,
  ip: string = newIp(),
): Promise<request.Response> {
  const csrf = await anonymousCsrf();
  return request(server)
    .post('/auth/register')
    .set('X-Forwarded-For', ip)
    .set('Cookie', `csrf=${encodeURIComponent(csrf)}`)
    .set('X-CSRF-Token', csrf)
    .send(body);
}

async function findUser(email: string): Promise<UserRow | undefined> {
  const [row] = await dataSource.query<UserRow[]>(
    'SELECT * FROM "user" WHERE email = $1',
    [email],
  );
  return row;
}

async function countUsers(email: string): Promise<number> {
  const [row] = await dataSource.query<{ count: number }[]>(
    'SELECT count(*)::int AS count FROM "user" WHERE lower(email) = lower($1)',
    [email],
  );
  return row.count;
}

async function emailJobsTo(email: string): Promise<EmailJobRow[]> {
  return dataSource.query<EmailJobRow[]>(
    `SELECT payload, "createdAt" FROM job
     WHERE type = 'email.send' AND payload->>'to' = $1
     ORDER BY "createdAt", id`,
    [email],
  );
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

describe('cadastro', () => {
  it('cria a conta não confirmada com a data e a versão dos termos e responde 202 com o e-mail', async () => {
    const body = validBody();
    const before = Date.now();

    const response = await register(body);

    expect(response.status).toBe(202);
    expect(response.body).toEqual({ email: body.email });
    const user = await findUser(body.email as string);
    expect(user).toMatchObject({
      name: 'Ana Souza',
      emailVerifiedAt: null,
      termsVersion: TERMS_VERSION,
    });
    expect(TERMS_VERSION).toBe('2026-11-19');
    expect(user!.termsAcceptedAt.getTime()).toBeGreaterThanOrEqual(
      before - 1000,
    );
    expect(user!.termsAcceptedAt.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('enfileira o e-mail de confirmação na mesma transação', async () => {
    const body = validBody({ next: '/grupos/abc?aba=lista' });

    await register(body);

    const user = await findUser(body.email as string);
    const jobs = await emailJobsTo(body.email as string);
    expect(jobs).toHaveLength(1);
    const [job] = jobs;
    expect(job.payload.subject).toBe('Confirme seu e-mail no Amigo Secreto');
    // now() do PostgreSQL é o início da transação: datas iguais provam que
    // a conta e o job nasceram na mesma transação.
    expect(job.createdAt.getTime()).toBe(user!.createdAt.getTime());
    const button = job.payload.blocks.find((block) => block.type === 'button');
    expect(button?.label).toBe('Confirmar e-mail');
    const link = new URL(button!.url!);
    expect(`${link.origin}${link.pathname}`).toBe(`${WEB_URL}/confirmar-email`);
    const token = link.searchParams.get('token')!;
    const [stored] = await dataSource.query<
      { type: string; next: string; userId: string }[]
    >('SELECT type, next, "userId" FROM auth_token WHERE "tokenHash" = $1', [
      sha256(token),
    ]);
    expect(stored).toEqual({
      type: 'email_verification',
      next: '/grupos/abc?aba=lista',
      userId: user!.id,
    });
  });

  it('grava o opt-in de marketing com a data quando a caixa vem marcada', async () => {
    const body = validBody({ marketingOptIn: true });
    const before = Date.now();

    await register(body);

    const user = await findUser(body.email as string);
    expect(user!.marketingOptIn).toBe(true);
    expect(user!.marketingOptInAt!.getTime()).toBeGreaterThanOrEqual(
      before - 1000,
    );
    expect(user!.marketingOptInAt!.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('grava a conta sem opt-in quando a caixa vem desmarcada', async () => {
    const unchecked = validBody({ marketingOptIn: false });
    const absent = validBody();
    delete absent.marketingOptIn;

    await register(unchecked);
    await register(absent);

    for (const body of [unchecked, absent]) {
      const user = await findUser(body.email as string);
      expect(user).toMatchObject({
        marketingOptIn: false,
        marketingOptInAt: null,
      });
    }
  });

  it('recusa com 400 sem a caixa de termos', async () => {
    const unchecked = validBody({ acceptTerms: false });
    const absent = validBody();
    delete absent.acceptTerms;

    const responses = [await register(unchecked), await register(absent)];

    expect(responses.map((response) => response.status)).toEqual([400, 400]);
    expect(await countUsers(unchecked.email as string)).toBe(0);
    expect(await countUsers(absent.email as string)).toBe(0);
  });

  it('recusa com 400 senha de 7 ou de 129 caracteres', async () => {
    const short = validBody({ password: 'a'.repeat(7) });
    const long = validBody({ password: 'a'.repeat(129) });

    const responses = [await register(short), await register(long)];

    expect(responses.map((response) => response.status)).toEqual([400, 400]);
    expect(await countUsers(short.email as string)).toBe(0);
    expect(await countUsers(long.email as string)).toBe(0);
  });

  it('recusa com 400 nome vazio depois do trim ou com 81 caracteres', async () => {
    const blank = validBody({ name: '   ' });
    const long = validBody({ name: 'a'.repeat(81) });

    const responses = [await register(blank), await register(long)];

    expect(responses.map((response) => response.status)).toEqual([400, 400]);
    expect(await countUsers(blank.email as string)).toBe(0);
    expect(await countUsers(long.email as string)).toBe(0);
  });

  it('recusa com 400 nome com 80 "❤️", que o banco conta como 160 caracteres', async () => {
    const body = validBody({ name: '❤️'.repeat(80) });

    const response = await register(body);

    expect(response.status).toBe(400);
    expect(await countUsers(body.email as string)).toBe(0);
  });

  it('recusa com 400 e-mail inválido', async () => {
    const invalid = `${randomUUID()}@`;

    const response = await register(validBody({ email: invalid }));

    expect(response.status).toBe(400);
    expect(await countUsers(invalid)).toBe(0);
  });

  it('responde igual para e-mail já cadastrado com outra caixa de letras, sem mudar a conta, e enfileira o aviso já tem conta', async () => {
    const email = newEmail();
    const first = await register(validBody({ email, name: 'Ana Souza' }));
    const original = await findUser(email);

    const second = await register(
      validBody({
        email: email.toUpperCase(),
        name: 'Outra Pessoa',
        password: 'outra-senha-456',
        marketingOptIn: true,
      }),
    );

    expect(second.status).toBe(first.status);
    expect(second.body).toEqual(first.body);
    expect(await findUser(email)).toEqual(original);
    expect(await countUsers(email)).toBe(1);
    const jobs = await emailJobsTo(email);
    expect(jobs.map((job) => job.payload.subject)).toEqual([
      'Confirme seu e-mail no Amigo Secreto',
      'Você já tem uma conta no Amigo Secreto',
    ]);
    expect(jobs[1].payload.blocks[0]).toEqual({
      type: 'paragraph',
      text: 'Olá, Ana Souza.',
    });
    expect(
      jobs[1].payload.blocks
        .filter((block) => block.type === 'button')
        .map((block) => [block.label, block.url]),
    ).toEqual([
      ['Entrar', `${WEB_URL}/entrar`],
      ['Redefinir senha', `${WEB_URL}/esqueci-a-senha`],
    ]);
  });

  it('não abre sessão', async () => {
    const body = validBody();

    const response = await register(body);

    expect(response.status).toBe(202);
    expect(setCookies(response).some((c) => c.startsWith('sid='))).toBe(false);
    const user = await findUser(body.email as string);
    const [row] = await dataSource.query<{ count: number }[]>(
      'SELECT count(*)::int AS count FROM session WHERE "userId" = $1',
      [user!.id],
    );
    expect(row.count).toBe(0);
  });

  it('guarda a senha como hash argon2id', async () => {
    const body = validBody({ password: 'minha-senha-secreta' });

    await register(body);

    const user = await findUser(body.email as string);
    expect(user!.passwordHash).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
    expect(user!.passwordHash).not.toContain('minha-senha-secreta');
    expect(
      await new PasswordHasher().verify(
        'minha-senha-secreta',
        user!.passwordHash,
      ),
    ).toBe(true);
  });

  it('guarda o e-mail sem espaços nas pontas e em minúsculas', async () => {
    const normalized = newEmail();

    const response = await register(
      validBody({ email: `  ${normalized.toUpperCase()}  ` }),
    );

    expect(response.body).toEqual({ email: normalized });
    expect((await findUser(normalized))?.email).toBe(normalized);
  });

  it('emite user.registered com method password e o id, sem e-mail nem nome', async () => {
    const output: string[] = [];
    Logger.overrideLogger(new AppLogger('production'));
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
      output.push(String(chunk));
      return true;
    });
    const body = validBody({ name: 'Nome Rastreável' });
    try {
      await register(body);
    } finally {
      vi.restoreAllMocks();
      // O app do teste sobe com logger: false.
      Logger.overrideLogger(false);
    }

    const user = await findUser(body.email as string);
    const events = output
      .flatMap((chunk) => chunk.split('\n'))
      .filter((line) => line.startsWith('{'))
      .map((line) => JSON.parse(line) as Record<string, unknown>)
      .filter((record) => record.event === 'user.registered');
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      event: 'user.registered',
      method: 'password',
      userId: user!.id,
    });
    const line = JSON.stringify(events[0]);
    expect(line).not.toContain(body.email as string);
    expect(line).not.toContain('Nome Rastreável');
  });

  it('cria uma conta só com dois cadastros simultâneos do mesmo e-mail', async () => {
    const email = newEmail();

    const responses = await Promise.all([
      register(validBody({ email })),
      register(validBody({ email: email.toUpperCase() })),
    ]);

    expect(responses.map((response) => response.status)).toEqual([202, 202]);
    expect(responses[0].body).toEqual(responses[1].body);
    expect(await countUsers(email)).toBe(1);
    const subjects = (await emailJobsTo(email))
      .map((job) => job.payload.subject)
      .sort();
    expect(subjects).toEqual([
      'Confirme seu e-mail no Amigo Secreto',
      'Você já tem uma conta no Amigo Secreto',
    ]);
  });

  it('responde 429 no 6º cadastro do mesmo e-mail em 1 hora sem enfileirar e-mail', async () => {
    const email = newEmail();
    const statuses = [];
    for (let attempt = 1; attempt <= 5; attempt++) {
      statuses.push((await register(validBody({ email }))).status);
    }

    const sixth = await register(validBody({ email }));

    expect(statuses).toEqual([202, 202, 202, 202, 202]);
    expect(sixth.status).toBe(429);
    expect(sixth.body).toMatchObject({
      statusCode: 429,
      message: 'Muitas tentativas. Tente de novo em 60 minutos.',
    });
    expect(await emailJobsTo(email)).toHaveLength(5);
  });

  it('responde 429 no 21º cadastro do mesmo IP em 1 hora', async () => {
    const ip = newIp();
    const statuses = [];
    for (let attempt = 1; attempt <= 20; attempt++) {
      statuses.push((await register(validBody(), ip)).status);
    }
    const blocked = validBody();

    const last = await register(blocked, ip);

    expect(statuses).toEqual(Array.from({ length: 20 }, () => 202));
    expect(last.status).toBe(429);
    expect(await countUsers(blocked.email as string)).toBe(0);
  });

  it('troca por /perfil um destino de outro site', async () => {
    const destinations = [
      'https://outro-site.com/x',
      '//outro-site.com/x',
      '/\\outro-site.com/x',
    ];

    const stored = [];
    for (const next of destinations) {
      const body = validBody({ next });
      await register(body);
      const user = await findUser(body.email as string);
      const [row] = await dataSource.query<{ next: string }[]>(
        'SELECT next FROM auth_token WHERE "userId" = $1',
        [user!.id],
      );
      stored.push(row.next);
    }

    expect(stored).toEqual(['/perfil', '/perfil', '/perfil']);
  });
});
