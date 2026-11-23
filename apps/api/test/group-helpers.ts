import { randomUUID } from 'node:crypto';
import { type INestApplication, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { DataSource } from 'typeorm';
import { configureApp } from '../src/app.setup.js';
import type { CookieResponse } from '../src/auth/cookies.js';
import { SessionsService } from '../src/auth/sessions.service.js';
import { generateInviteCode } from '../src/invites/invite-code.js';
import { AppLogger } from '../src/observability/app-logger.js';
import { stubAccountEnv } from './account-env.js';
import { createIsolatedDatabase } from './isolated-database.js';

export type Cookies = { sid: string; csrf: string };

export type GroupsApi = {
  app: INestApplication;
  server: App;
  dataSource: DataSource;
  sessions: SessionsService;
};

// Sobe as rotas de grupo com sessão e CSRF num banco isolado. Com
// `trustProxyHops: 1`, cada teste fala de um IP próprio pelo X-Forwarded-For.
export async function startGroupsApi(
  database: string,
  options: { trustProxyHops?: number } = {},
): Promise<GroupsApi> {
  // O ConfigModule valida o ambiente quando o módulo é importado.
  vi.stubEnv('DATABASE_URL', await createIsolatedDatabase(database));
  stubAccountEnv();
  if (options.trustProxyHops !== undefined) {
    vi.stubEnv('TRUST_PROXY_HOPS', String(options.trustProxyHops));
  }
  const { GroupsApiFixtureModule } =
    await import('./fixtures/groups-api-fixture.module.js');
  const app = await NestFactory.create(GroupsApiFixtureModule, {
    logger: false,
  });
  configureApp(app);
  await app.init();
  return {
    app,
    server: app.getHttpServer() as App,
    dataSource: app.get(DataSource),
    sessions: app.get(SessionsService),
  };
}

export async function stopGroupsApi(api: GroupsApi): Promise<void> {
  await api.app.close();
  vi.unstubAllEnvs();
}

export async function insertUser(
  dataSource: DataSource,
  name = 'Ana Souza',
): Promise<{ id: string; email: string }> {
  const email = `${randomUUID()}@exemplo.com`;
  const [row] = await dataSource.query<{ id: string }[]>(
    `INSERT INTO "user" (name, email, "passwordHash", "emailVerifiedAt",
       "termsVersion", "termsAcceptedAt")
     VALUES ($1, $2, 'hash-qualquer', now(), '2026-11-19', now())
     RETURNING id`,
    [name, email],
  );
  return { id: row.id, email };
}

// Abre uma sessão como o login faz: grava sid e um csrf da sessão nova.
export async function openSession(
  sessions: SessionsService,
  userId: string,
): Promise<Cookies> {
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

export function withSession(
  test: request.Test,
  cookies: Cookies,
): request.Test {
  return test
    .set(
      'Cookie',
      `sid=${encodeURIComponent(cookies.sid)}; csrf=${encodeURIComponent(cookies.csrf)}`,
    )
    .set('X-CSRF-Token', cookies.csrf);
}

export type GroupSeed = {
  ownerId: string;
  name?: string;
  status?: 'OPEN' | 'DRAWN' | 'CLOSED';
  createdAt?: string;
  drawScheduledAt?: string | null;
  eventAt?: string | null;
  description?: string | null;
  eventLocation?: string | null;
  giftMinValue?: number | null;
  giftMaxValue?: number | null;
  isOnlineEvent?: boolean;
  requiresApproval?: boolean;
};

// Grava o grupo direto no banco, com a participação aprovada de quem organiza.
export async function insertGroup(
  dataSource: DataSource,
  seed: GroupSeed,
): Promise<string> {
  const status = seed.status ?? 'OPEN';
  const [row] = await dataSource.query<{ id: string }[]>(
    `INSERT INTO "group" (name, "ownerId", status, "closedAt", "createdAt",
       "drawScheduledAt", "eventAt", description, "eventLocation",
       "giftMinValue", "giftMaxValue", "isOnlineEvent", "requiresApproval",
       "inviteCode")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
     RETURNING id`,
    [
      seed.name ?? 'Família',
      seed.ownerId,
      status,
      status === 'CLOSED' ? new Date() : null,
      seed.createdAt ?? new Date().toISOString(),
      seed.drawScheduledAt ?? null,
      seed.eventAt ?? null,
      seed.description ?? null,
      seed.eventLocation ?? null,
      seed.giftMinValue ?? null,
      seed.giftMaxValue ?? null,
      seed.isOnlineEvent ?? false,
      seed.requiresApproval ?? false,
      generateInviteCode(),
    ],
  );
  await insertMembership(dataSource, row.id, seed.ownerId, 'APPROVED');
  return row.id;
}

export async function insertMembership(
  dataSource: DataSource,
  groupId: string,
  userId: string,
  status: 'PENDING' | 'APPROVED' | 'REJECTED',
): Promise<void> {
  await dataSource.query(
    `INSERT INTO membership ("groupId", "userId", status) VALUES ($1, $2, $3)`,
    [groupId, userId, status],
  );
}

// Captura as linhas de evento de negócio gravadas durante `action`.
export async function captureEvents(
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
