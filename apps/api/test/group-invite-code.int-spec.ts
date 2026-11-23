import pg from 'pg';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { inject } from 'vitest';
import { AddGroupInviteCode1795457250357 } from '../src/database/migrations/1795457250357-AddGroupInviteCode.js';
import { CreateGroupTable1795290372036 } from '../src/database/migrations/1795290372036-CreateGroupTable.js';
import { CreateUserTable1795180059667 } from '../src/database/migrations/1795180059667-CreateUserTable.js';
import { generateInviteCode } from '../src/invites/invite-code.js';
import {
  type Cookies,
  type GroupsApi,
  insertGroup,
  insertMembership,
  insertUser,
  openSession,
  startGroupsApi,
  stopGroupsApi,
  withSession,
} from './group-helpers.js';

// O sorteio continua real; o teste da colisão só fixa o próximo código.
vi.mock('../src/invites/invite-code.js', async (importOriginal) => {
  const original =
    await importOriginal<typeof import('../src/invites/invite-code.js')>();
  return {
    ...original,
    generateInviteCode: vi.fn(original.generateInviteCode),
  };
});

const CODE_PATTERN = /^[23456789abcdefghjkmnpqrstuvwxyz]{10}$/;
const MIGRATION_DATABASE = 'group_invite_code_migration';

let api: GroupsApi;

beforeAll(async () => {
  api = await startGroupsApi('group_invite_code');
});

afterAll(async () => {
  await stopGroupsApi(api);
});

async function inviteCodeOf(groupId: string): Promise<string> {
  const [row] = await api.dataSource.query<{ inviteCode: string }[]>(
    'SELECT "inviteCode" FROM "group" WHERE id = $1',
    [groupId],
  );
  return row.inviteCode;
}

async function groupsOwnedBy(
  ownerId: string,
): Promise<{ id: string; inviteCode: string }[]> {
  return api.dataSource.query(
    'SELECT id, "inviteCode" FROM "group" WHERE "ownerId" = $1',
    [ownerId],
  );
}

function createGroup(cookies: Cookies): request.Test {
  return withSession(request(api.server).post('/groups'), cookies).send({
    name: 'Família 2026',
  });
}

async function createEmptyDatabase(name: string): Promise<string> {
  const admin = new pg.Client({ connectionString: inject('databaseUrl') });
  await admin.connect();
  try {
    await admin.query(`DROP DATABASE IF EXISTS ${name}`);
    await admin.query(`CREATE DATABASE ${name}`);
  } finally {
    await admin.end();
  }
  const databaseUrl = new URL(inject('databaseUrl'));
  databaseUrl.pathname = `/${name}`;
  return databaseUrl.href;
}

async function migrate(
  databaseUrl: string,
  migrations: (new () => object)[],
  run: (dataSource: DataSource) => Promise<void> = () => Promise.resolve(),
): Promise<void> {
  const dataSource = new DataSource({
    type: 'postgres',
    url: databaseUrl,
    migrations,
  });
  await dataSource.initialize();
  try {
    await dataSource.runMigrations();
    await run(dataSource);
  } finally {
    await dataSource.destroy();
  }
}

describe('código do convite do grupo', () => {
  it('grupo criado pela API ganha um código de 10 caracteres do alfabeto', async () => {
    const owner = await insertUser(api.dataSource);

    const response = await createGroup(
      await openSession(api.sessions, owner.id),
    );

    expect(response.status).toBe(201);
    const [group] = await groupsOwnedBy(owner.id);
    expect(group.inviteCode).toMatch(CODE_PATTERN);
  });

  it('a migration dá um código a cada grupo que já existia', async () => {
    const databaseUrl = await createEmptyDatabase(MIGRATION_DATABASE);
    const before = [
      CreateUserTable1795180059667,
      CreateGroupTable1795290372036,
    ];

    await migrate(databaseUrl, before, async (dataSource) => {
      const [owner] = await dataSource.query<{ id: string }[]>(
        `INSERT INTO "user" (name, email, "termsVersion", "termsAcceptedAt")
         VALUES ('Ana', 'ana@exemplo.com', '2026-11-19', now()) RETURNING id`,
      );
      for (const name of ['Família', 'Trabalho', 'Amigos']) {
        await dataSource.query(
          `INSERT INTO "group" (name, "ownerId") VALUES ($1, $2)`,
          [name, owner.id],
        );
      }
    });

    let codes: string[] = [];
    await migrate(
      databaseUrl,
      [...before, AddGroupInviteCode1795457250357],
      async (dataSource) => {
        const rows = await dataSource.query<{ inviteCode: string | null }[]>(
          'SELECT "inviteCode" FROM "group"',
        );
        codes = rows.map((row) => row.inviteCode ?? '');
      },
    );

    expect(codes).toHaveLength(3);
    for (const code of codes) expect(code).toMatch(CODE_PATTERN);
    expect(new Set(codes).size).toBe(3);
  });

  it('o banco recusa dois grupos com o mesmo código', async () => {
    const owner = await insertUser(api.dataSource);
    const first = await insertGroup(api.dataSource, { ownerId: owner.id });
    const second = await insertGroup(api.dataSource, { ownerId: owner.id });

    await expect(
      api.dataSource.query(
        'UPDATE "group" SET "inviteCode" = $1 WHERE id = $2',
        [await inviteCodeOf(first), second],
      ),
    ).rejects.toThrow(/duplicate key value violates unique constraint/);
  });

  it('o banco recusa grupo sem código', async () => {
    const owner = await insertUser(api.dataSource);

    await expect(
      api.dataSource.query(
        `INSERT INTO "group" (name, "ownerId") VALUES ('Família', $1)`,
        [owner.id],
      ),
    ).rejects.toThrow(/null value in column "inviteCode"/);
  });

  it('devolve o código na leitura do grupo a participante aprovado', async () => {
    const owner = await insertUser(api.dataSource);
    const member = await insertUser(api.dataSource, 'Bia Lima');
    const groupId = await insertGroup(api.dataSource, { ownerId: owner.id });
    await insertMembership(api.dataSource, groupId, member.id, 'APPROVED');

    const response = await withSession(
      request(api.server).get(`/groups/${groupId}`),
      await openSession(api.sessions, member.id),
    );

    expect(response.status).toBe(200);
    expect((response.body as { inviteCode: string }).inviteCode).toBe(
      await inviteCodeOf(groupId),
    );
  });

  it('gera outro código quando o primeiro já existe', async () => {
    const other = await insertUser(api.dataSource);
    const taken = await inviteCodeOf(
      await insertGroup(api.dataSource, { ownerId: other.id }),
    );
    const owner = await insertUser(api.dataSource);
    vi.mocked(generateInviteCode).mockReturnValueOnce(taken);

    const response = await createGroup(
      await openSession(api.sessions, owner.id),
    );

    expect(response.status).toBe(201);
    const groups = await groupsOwnedBy(owner.id);
    expect(groups).toHaveLength(1);
    expect(groups[0].inviteCode).toMatch(CODE_PATTERN);
    expect(groups[0].inviteCode).not.toBe(taken);
    expect((response.body as { inviteCode: string }).inviteCode).toBe(
      groups[0].inviteCode,
    );
  });
});
