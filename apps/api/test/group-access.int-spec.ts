import { randomUUID } from 'node:crypto';
import {
  ForbiddenException,
  HttpException,
  type INestApplicationContext,
  NotFoundException,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import pg from 'pg';
import { DataSource } from 'typeorm';
import { inject } from 'vitest';
import { GroupAccess } from '../src/groups/group-access.service.js';

class RollbackSignal extends Error {}

async function rejection(promise: Promise<unknown>): Promise<HttpException> {
  const error: unknown = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(HttpException);
  return error as HttpException;
}

async function expectNotFound(promise: Promise<unknown>): Promise<void> {
  const error = await rejection(promise);
  expect(error).toBeInstanceOf(NotFoundException);
  expect(error.getStatus()).toBe(404);
  expect(error.getResponse()).toMatchObject({
    statusCode: 404,
    message: 'Grupo não encontrado.',
  });
}

describe('acesso ao grupo', () => {
  let app: INestApplicationContext;
  let access: GroupAccess;
  let dataSource: DataSource;
  const userIds: string[] = [];

  let ownerId: string;
  let approvedId: string;
  let pendingId: string;
  let rejectedId: string;
  let outsiderId: string;
  let groupId: string;

  async function insertUser(label: string): Promise<string> {
    const rows: { id: string }[] = await dataSource.query(
      `INSERT INTO "user" (name, email, "termsVersion", "termsAcceptedAt")
       VALUES ('Ana', $1, '2026-11-19', now()) RETURNING id`,
      [`acesso-${label}-${randomUUID()}@exemplo.com`],
    );
    userIds.push(rows[0].id);
    return rows[0].id;
  }

  async function insertMembership(userId: string, status: string) {
    await dataSource.query(
      `INSERT INTO membership ("groupId", "userId", status) VALUES ($1, $2, $3)`,
      [groupId, userId, status],
    );
  }

  // Outra conexão tenta travar a linha sem esperar: falha se ela já está
  // travada por outra transação.
  async function lockFromAnotherConnection(): Promise<void> {
    const client = new pg.Client({ connectionString: inject('databaseUrl') });
    await client.connect();
    try {
      await client.query(
        `SELECT id FROM "group" WHERE id = $1 FOR UPDATE NOWAIT`,
        [groupId],
      );
    } finally {
      await client.end();
    }
  }

  beforeAll(async () => {
    // O ConfigModule valida o ambiente quando o módulo é importado.
    vi.stubEnv('DATABASE_URL', inject('databaseUrl'));
    const { GroupsFixtureModule } =
      await import('./fixtures/groups-fixture.module.js');
    app = await NestFactory.createApplicationContext(GroupsFixtureModule, {
      logger: false,
    });
    access = app.get(GroupAccess);
    dataSource = app.get(DataSource);

    ownerId = await insertUser('dono');
    approvedId = await insertUser('aprovada');
    pendingId = await insertUser('pendente');
    rejectedId = await insertUser('recusada');
    outsiderId = await insertUser('de-fora');
    const rows: { id: string }[] = await dataSource.query(
      `INSERT INTO "group" (name, "ownerId") VALUES ('Família', $1) RETURNING id`,
      [ownerId],
    );
    groupId = rows[0].id;
    await insertMembership(ownerId, 'APPROVED');
    await insertMembership(approvedId, 'APPROVED');
    await insertMembership(pendingId, 'PENDING');
    await insertMembership(rejectedId, 'REJECTED');
  });

  afterAll(async () => {
    await dataSource.query(`DELETE FROM "group" WHERE id = $1`, [groupId]);
    await dataSource.query(`DELETE FROM "user" WHERE id = ANY($1)`, [userIds]);
    await app.close();
    vi.unstubAllEnvs();
  });

  it('responde 404 para id que não é UUID', async () => {
    for (const id of ['abc', '123', `${randomUUID()}x`, "' OR 1=1 --"]) {
      await expectNotFound(access.requireMember(ownerId, id));
      await expectNotFound(access.requireOrganizer(ownerId, id));
    }
  });

  it('responde 404 para grupo inexistente', async () => {
    await expectNotFound(access.requireMember(ownerId, randomUUID()));
    await expectNotFound(access.requireOrganizer(ownerId, randomUUID()));
  });

  it('responde 404 para quem não participa e para participação pendente ou recusada', async () => {
    for (const userId of [outsiderId, pendingId, rejectedId]) {
      await expectNotFound(access.requireMember(userId, groupId));
      await expectNotFound(access.requireOrganizer(userId, groupId));
    }
  });

  it('responde 403 para participante aprovado que não organiza', async () => {
    const error = await rejection(access.requireOrganizer(approvedId, groupId));

    expect(error).toBeInstanceOf(ForbiddenException);
    expect(error.getStatus()).toBe(403);
    expect(error.getResponse()).toMatchObject({
      statusCode: 403,
      message: 'Só quem organiza pode alterar o grupo.',
    });
    await expect(
      access.requireMember(approvedId, groupId),
    ).resolves.toMatchObject({
      group: { id: groupId, ownerId },
      membership: { groupId, userId: approvedId, status: 'APPROVED' },
    });
  });

  it('devolve o grupo e a participação do organizador', async () => {
    await expect(
      access.requireOrganizer(ownerId, groupId),
    ).resolves.toMatchObject({
      group: { id: groupId, name: 'Família', ownerId, status: 'OPEN' },
      membership: { groupId, userId: ownerId, status: 'APPROVED' },
    });
  });

  it('trava a linha do grupo até a transação terminar', async () => {
    await expect(
      dataSource.transaction(async (manager) => {
        await access.requireOrganizer(ownerId, groupId, {
          manager,
          lock: true,
        });
        await expect(lockFromAnotherConnection()).rejects.toThrow(
          /could not obtain lock on row/,
        );
        throw new RollbackSignal();
      }),
    ).rejects.toBeInstanceOf(RollbackSignal);

    await expect(lockFromAnotherConnection()).resolves.toBeUndefined();

    await dataSource.transaction(async (manager) => {
      await access.requireMember(approvedId, groupId, { manager });
      await expect(lockFromAnotherConnection()).resolves.toBeUndefined();
    });
  });
});
