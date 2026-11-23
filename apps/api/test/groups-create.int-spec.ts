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
import { stubAccountEnv } from './account-env.js';
import { createIsolatedDatabase } from './isolated-database.js';

type Cookies = { sid: string; csrf: string };

type GroupRow = {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  giftMinValue: number | null;
  giftMaxValue: number | null;
  drawScheduledAt: Date | null;
  eventAt: Date | null;
  eventLocation: string | null;
  isOnlineEvent: boolean;
  requiresApproval: boolean;
  status: string;
  closedAt: Date | null;
  inviteCode: string;
};

const NEXT_YEAR = new Date().getUTCFullYear() + 1;
const DRAW_AT = `${NEXT_YEAR}-12-10T20:00:00.000Z`;
const EVENT_AT = `${NEXT_YEAR}-12-20T22:00:00.000Z`;
const PAST = '2020-01-01T12:00:00.000Z';

let app: INestApplication;
let server: App;
let dataSource: DataSource;
let sessions: SessionsService;

beforeAll(async () => {
  // O ConfigModule valida o ambiente quando o módulo é importado.
  vi.stubEnv('DATABASE_URL', await createIsolatedDatabase('groups_create'));
  stubAccountEnv();
  const { GroupsApiFixtureModule } =
    await import('./fixtures/groups-api-fixture.module.js');
  app = await NestFactory.create(GroupsApiFixtureModule, { logger: false });
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

async function createAccount(
  options: { verified?: boolean; name?: string } = {},
): Promise<string> {
  const [row] = await dataSource.query<{ id: string }[]>(
    `INSERT INTO "user" (name, email, "passwordHash", "emailVerifiedAt",
       "termsVersion", "termsAcceptedAt")
     VALUES ($1, $2, 'hash-qualquer', $3, '2026-11-19', now())
     RETURNING id`,
    [
      options.name ?? 'Ana Souza',
      `${randomUUID()}@exemplo.com`,
      options.verified === false ? null : new Date(),
    ],
  );
  return row.id;
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

async function signedIn(
  options: { verified?: boolean; name?: string } = {},
): Promise<{ userId: string; cookies: Cookies }> {
  const userId = await createAccount(options);
  return { userId, cookies: await openSession(userId) };
}

function createGroup(cookies: Cookies, body: object): request.Test {
  return request(server)
    .post('/groups')
    .set(
      'Cookie',
      `sid=${encodeURIComponent(cookies.sid)}; csrf=${encodeURIComponent(cookies.csrf)}`,
    )
    .set('X-CSRF-Token', cookies.csrf)
    .send(body);
}

async function groupsOf(ownerId: string): Promise<GroupRow[]> {
  return dataSource.query<GroupRow[]>(
    'SELECT * FROM "group" WHERE "ownerId" = $1',
    [ownerId],
  );
}

async function expectNoGroup(ownerId: string): Promise<void> {
  expect(await groupsOf(ownerId)).toHaveLength(0);
}

function invalid(fields: Record<string, string>): object {
  return {
    statusCode: 400,
    message: 'Dados inválidos.',
    error: 'Bad Request',
    fields,
  };
}

// Captura as linhas de evento de negócio gravadas durante `action`.
async function captureEvents(
  action: () => Promise<unknown>,
): Promise<Record<string, unknown>[]> {
  const output: string[] = [];
  Logger.overrideLogger(new AppLogger('production'));
  vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
    output.push(String(chunk));
    return true;
  });
  try {
    await action();
  } finally {
    vi.restoreAllMocks();
    // O app do teste sobe com logger: false.
    Logger.overrideLogger(false);
  }
  return output
    .flatMap((chunk) => chunk.split('\n'))
    .filter((line) => line.startsWith('{'))
    .map((line) => JSON.parse(line) as Record<string, unknown>)
    .filter((record) => typeof record.event === 'string');
}

describe('criar grupo', () => {
  it('cria o grupo ABERTO só com o nome, com a pessoa organizadora e participante aprovada', async () => {
    const { userId, cookies } = await signedIn({ name: 'Ana Souza' });

    const response = await createGroup(cookies, { name: 'Família 2026' });

    expect(response.status).toBe(201);
    const [group] = await groupsOf(userId);
    expect(group).toMatchObject({
      name: 'Família 2026',
      description: null,
      ownerId: userId,
      giftMinValue: null,
      giftMaxValue: null,
      drawScheduledAt: null,
      eventAt: null,
      eventLocation: null,
      isOnlineEvent: false,
      requiresApproval: false,
      status: 'OPEN',
      closedAt: null,
    });
    const memberships = await dataSource.query<
      { userId: string; status: string }[]
    >('SELECT "userId", status FROM membership WHERE "groupId" = $1', [
      group.id,
    ]);
    expect(memberships).toEqual([{ userId, status: 'APPROVED' }]);
    expect(response.body).toEqual({
      id: group.id,
      name: 'Família 2026',
      status: 'OPEN',
      description: null,
      giftMinValue: null,
      giftMaxValue: null,
      drawScheduledAt: null,
      eventAt: null,
      eventLocation: null,
      isOnlineEvent: false,
      requiresApproval: false,
      owner: { id: userId, name: 'Ana Souza' },
      isOrganizer: true,
      closedAt: null,
      createdAt: expect.any(String) as string,
      inviteCode: group.inviteCode,
    });
  });

  it('grava todos os campos opcionais enviados', async () => {
    const { userId, cookies } = await signedIn();

    const response = await createGroup(cookies, {
      name: 'Firma',
      description: 'Traga um presente.\nSem pegadinha.',
      giftMinValue: 50,
      giftMaxValue: 100,
      drawScheduledAt: DRAW_AT,
      eventAt: EVENT_AT,
      eventLocation: 'Rua das Flores, 10',
      isOnlineEvent: true,
      requiresApproval: true,
    });

    expect(response.status).toBe(201);
    const [group] = await groupsOf(userId);
    expect(group).toMatchObject({
      name: 'Firma',
      description: 'Traga um presente.\nSem pegadinha.',
      giftMinValue: 50,
      giftMaxValue: 100,
      drawScheduledAt: new Date(DRAW_AT),
      eventAt: new Date(EVENT_AT),
      eventLocation: 'Rua das Flores, 10',
      isOnlineEvent: true,
      requiresApproval: true,
      status: 'OPEN',
    });
  });

  it('grava mínimo e máximo iguais quando só o valor inicial vem', async () => {
    const { userId, cookies } = await signedIn();

    const response = await createGroup(cookies, {
      name: 'Valor único',
      giftMinValue: 50,
    });

    expect(response.status).toBe(201);
    const [group] = await groupsOf(userId);
    expect(group.giftMinValue).toBe(50);
    expect(group.giftMaxValue).toBe(50);
  });

  it('grava a faixa quando os dois valores vêm', async () => {
    const { userId, cookies } = await signedIn();

    const response = await createGroup(cookies, {
      name: 'Faixa',
      giftMinValue: 50,
      giftMaxValue: 100,
    });

    expect(response.status).toBe(201);
    const [group] = await groupsOf(userId);
    expect(group.giftMinValue).toBe(50);
    expect(group.giftMaxValue).toBe(100);
  });

  it('recusa com 400 e a mensagem do campo nome vazio ou com 81 caracteres', async () => {
    const { userId, cookies } = await signedIn();

    const empty = await createGroup(cookies, { name: '   ' });
    expect(empty.status).toBe(400);
    expect(empty.body).toEqual(
      invalid({ name: 'Informe um nome de 1 a 80 caracteres.' }),
    );
    await expectNoGroup(userId);

    const tooLong = await createGroup(cookies, { name: 'a'.repeat(81) });
    expect(tooLong.status).toBe(400);
    expect(tooLong.body).toEqual(
      invalid({ name: 'Informe um nome de 1 a 80 caracteres.' }),
    );
    await expectNoGroup(userId);

    const longest = await createGroup(cookies, { name: 'a'.repeat(80) });
    expect(longest.status).toBe(201);
  });

  it('recusa com 400 nome com 80 "❤️", que o banco conta como 160 caracteres', async () => {
    const { userId, cookies } = await signedIn();

    const response = await createGroup(cookies, { name: '❤️'.repeat(80) });

    expect(response.status).toBe(400);
    expect(response.body).toEqual(
      invalid({ name: 'Informe um nome de 1 a 80 caracteres.' }),
    );
    await expectNoGroup(userId);
  });

  it('recusa com 400 recado com 1001 caracteres', async () => {
    const { userId, cookies } = await signedIn();

    const response = await createGroup(cookies, {
      name: 'Recado longo',
      description: 'a'.repeat(1001),
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual(
      invalid({ description: 'Use no máximo 1.000 caracteres.' }),
    );
    await expectNoGroup(userId);
  });

  it('recusa com 400 valor fora de 1 a 100000 ou não inteiro', async () => {
    const { userId, cookies } = await signedIn();
    const message = 'Informe um valor inteiro de R$ 1 a R$ 100.000.';

    // Só o valor inicial grava o máximo igual: os dois campos levam a mensagem.
    for (const giftMinValue of [0, 100001, 50.5]) {
      const response = await createGroup(cookies, {
        name: 'Valor',
        giftMinValue,
      });
      expect(response.status).toBe(400);
      expect(response.body).toEqual(
        invalid({ giftMinValue: message, giftMaxValue: message }),
      );
      await expectNoGroup(userId);
    }

    for (const giftMinValue of [0, 100001, 50.5]) {
      const response = await createGroup(cookies, {
        name: 'Valor',
        giftMinValue,
        giftMaxValue: 100,
      });
      expect(response.status).toBe(400);
      expect(response.body).toEqual(invalid({ giftMinValue: message }));
      await expectNoGroup(userId);
    }

    for (const giftMaxValue of [100001, 50.5]) {
      const response = await createGroup(cookies, {
        name: 'Valor',
        giftMinValue: 10,
        giftMaxValue,
      });
      expect(response.status).toBe(400);
      expect(response.body).toEqual(invalid({ giftMaxValue: message }));
      await expectNoGroup(userId);
    }
  });

  it('recusa com 400 o valor final sem o inicial', async () => {
    const { userId, cookies } = await signedIn();

    const response = await createGroup(cookies, {
      name: 'Só o final',
      giftMinValue: null,
      giftMaxValue: 100,
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual(
      invalid({ giftMinValue: 'Informe o valor inicial da faixa.' }),
    );
    await expectNoGroup(userId);
  });

  it('recusa com 400 valor inicial maior que o final', async () => {
    const { userId, cookies } = await signedIn();

    const response = await createGroup(cookies, {
      name: 'Faixa invertida',
      giftMinValue: 101,
      giftMaxValue: 100,
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual(
      invalid({
        giftMinValue: 'O valor inicial não pode passar do valor final.',
      }),
    );
    await expectNoGroup(userId);
  });

  it('recusa com 400 data no passado', async () => {
    const { userId, cookies } = await signedIn();

    const draw = await createGroup(cookies, {
      name: 'Sorteio passado',
      drawScheduledAt: PAST,
    });
    expect(draw.status).toBe(400);
    expect(draw.body).toEqual(
      invalid({ drawScheduledAt: 'Escolha uma data no futuro.' }),
    );
    await expectNoGroup(userId);

    const event = await createGroup(cookies, {
      name: 'Festa passada',
      eventAt: PAST,
    });
    expect(event.status).toBe(400);
    expect(event.body).toEqual(
      invalid({ eventAt: 'Escolha uma data no futuro.' }),
    );
    await expectNoGroup(userId);
  });

  it('recusa com 400 sorteio previsto depois da confraternização', async () => {
    const { userId, cookies } = await signedIn();
    const message = 'O sorteio previsto precisa ser antes da confraternização.';

    const after = await createGroup(cookies, {
      name: 'Sorteio depois',
      drawScheduledAt: EVENT_AT,
      eventAt: DRAW_AT,
    });
    expect(after.status).toBe(400);
    expect(after.body).toEqual(invalid({ drawScheduledAt: message }));
    await expectNoGroup(userId);

    const same = await createGroup(cookies, {
      name: 'Sorteio na festa',
      drawScheduledAt: EVENT_AT,
      eventAt: EVENT_AT,
    });
    expect(same.status).toBe(400);
    expect(same.body).toEqual(invalid({ drawScheduledAt: message }));
    await expectNoGroup(userId);
  });

  it('recusa com 400 local com 201 caracteres', async () => {
    const { userId, cookies } = await signedIn();

    const response = await createGroup(cookies, {
      name: 'Local longo',
      eventLocation: 'a'.repeat(201),
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual(
      invalid({ eventLocation: 'Use no máximo 200 caracteres.' }),
    );
    await expectNoGroup(userId);
  });

  it('recusa com 429 a 21ª criação da hora e aceita a 20ª', async () => {
    const { userId, cookies } = await signedIn();
    const statuses: number[] = [];
    for (let attempt = 1; attempt <= 20; attempt++) {
      statuses.push(
        (await createGroup(cookies, { name: `Grupo ${attempt}` })).status,
      );
    }

    const last = await createGroup(cookies, { name: 'Grupo 21' });

    expect(statuses).toEqual(Array<number>(20).fill(201));
    expect(last.status).toBe(429);
    expect(last.body).toEqual({
      statusCode: 429,
      message: expect.stringMatching(
        /^Muitas tentativas\. Tente de novo em (1 minuto|\d+ minutos)\.$/,
      ) as string,
      error: 'Too Many Requests',
    });
    expect(Number(last.headers['retry-after'])).toBeGreaterThan(0);
    const names = (await groupsOf(userId)).map((group) => group.name);
    expect(names).toHaveLength(20);
    expect(names).not.toContain('Grupo 21');
  });

  it('não conta no limite a criação recusada com 400', async () => {
    const { userId, cookies } = await signedIn();
    for (let attempt = 1; attempt <= 20; attempt++) {
      const refused = await createGroup(cookies, { name: '' });
      expect(refused.status).toBe(400);
    }
    await expectNoGroup(userId);

    const statuses: number[] = [];
    for (let attempt = 1; attempt <= 20; attempt++) {
      statuses.push(
        (await createGroup(cookies, { name: `Grupo ${attempt}` })).status,
      );
    }

    expect(statuses).toEqual(Array<number>(20).fill(201));
    expect(await groupsOf(userId)).toHaveLength(20);
  });

  it('cria o grupo para conta com e-mail não confirmado', async () => {
    const { userId, cookies } = await signedIn({ verified: false });

    const response = await createGroup(cookies, { name: 'Recém-chegada' });

    expect(response.status).toBe(201);
    const [group] = await groupsOf(userId);
    expect(group).toMatchObject({ name: 'Recém-chegada', status: 'OPEN' });
  });

  it('grava as datas com o fuso e devolve o mesmo instante', async () => {
    const { userId, cookies } = await signedIn();

    const response = await createGroup(cookies, {
      name: 'Fuso',
      drawScheduledAt: `${NEXT_YEAR}-12-10T17:00:00-03:00`,
      eventAt: `${NEXT_YEAR}-12-20T19:00:00-03:00`,
    });

    expect(response.status).toBe(201);
    const body = response.body as { drawScheduledAt: string; eventAt: string };
    expect(body.drawScheduledAt).toBe(DRAW_AT);
    expect(body.eventAt).toBe(EVENT_AT);
    const [group] = await groupsOf(userId);
    expect(group.drawScheduledAt?.toISOString()).toBe(DRAW_AT);
    expect(group.eventAt?.toISOString()).toBe(EVENT_AT);
  });

  it('emite group.created com o groupId e sem dados pessoais', async () => {
    const { userId, cookies } = await signedIn({ name: 'Nome Rastreável' });

    const events = await captureEvents(() =>
      createGroup(cookies, {
        name: 'Grupo Rastreável',
        description: 'Recado Rastreável',
        eventLocation: 'Local Rastreável',
      }).expect(201),
    );

    const [group] = await groupsOf(userId);
    const created = events.filter((record) => record.event === 'group.created');
    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({
      event: 'group.created',
      groupId: group.id,
    });
    const line = JSON.stringify(created[0]);
    for (const personal of [
      'Grupo Rastreável',
      'Recado Rastreável',
      'Local Rastreável',
      'Nome Rastreável',
      '@exemplo.com',
    ]) {
      expect(line).not.toContain(personal);
    }
  });

  it('não emite group.created quando a criação é recusada', async () => {
    const { userId, cookies } = await signedIn();
    for (let attempt = 1; attempt <= 20; attempt++) {
      await createGroup(cookies, { name: `Grupo ${attempt}` }).expect(201);
    }

    const events = await captureEvents(async () => {
      await createGroup(cookies, { name: '' }).expect(400);
      await createGroup(cookies, { name: 'Grupo 21' }).expect(429);
    });

    expect(events.filter((record) => record.event === 'group.created')).toEqual(
      [],
    );
    expect(await groupsOf(userId)).toHaveLength(20);
  });

  it('responde 401 sem sessão', async () => {
    const [{ count: before }] = await dataSource.query<{ count: string }[]>(
      'SELECT count(*) FROM "group"',
    );

    const response = await request(server)
      .post('/groups')
      .send({ name: 'Sem sessão' });

    expect(response.status).toBe(401);
    const [{ count: after }] = await dataSource.query<{ count: string }[]>(
      'SELECT count(*) FROM "group"',
    );
    expect(after).toBe(before);
  });
});
