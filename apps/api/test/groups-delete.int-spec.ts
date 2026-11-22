import request from 'supertest';
import {
  captureEvents,
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

const WEB_URL = 'http://localhost:3000';

type EmailJob = {
  to: string;
  subject: string;
  blocks: { type: string; text?: string; label?: string; url?: string }[];
};

let api: GroupsApi;

beforeAll(async () => {
  api = await startGroupsApi('groups_delete');
});

afterAll(async () => {
  await stopGroupsApi(api);
});

function deleteGroup(cookies: Cookies, id: string): request.Test {
  return withSession(request(api.server).delete(`/groups/${id}`), cookies);
}

async function groupExists(id: string): Promise<boolean> {
  const rows = await api.dataSource.query<unknown[]>(
    'SELECT 1 FROM "group" WHERE id = $1',
    [id],
  );
  return rows.length > 0;
}

async function membershipCount(groupId: string): Promise<number> {
  const [{ count }] = await api.dataSource.query<{ count: number }[]>(
    'SELECT count(*)::int AS count FROM membership WHERE "groupId" = $1',
    [groupId],
  );
  return count;
}

async function emailJobsTo(...emails: string[]): Promise<EmailJob[]> {
  const rows = await api.dataSource.query<{ payload: EmailJob }[]>(
    `SELECT payload FROM job
     WHERE type = 'email.send' AND payload->>'to' = ANY($1)
     ORDER BY "createdAt", id`,
    [emails],
  );
  return rows.map((row) => row.payload);
}

type Scenario = {
  owner: { id: string; email: string };
  groupId: string;
  cookies: Cookies;
  members: { id: string; email: string; name: string }[];
};

// Organizer "Ana Souza" e dois participantes aprovados, "Bia" e "Caio".
async function groupWithMembers(
  seed: Partial<Parameters<typeof insertGroup>[1]> = {},
): Promise<Scenario> {
  const owner = await insertUser(api.dataSource, 'Ana Souza');
  const groupId = await insertGroup(api.dataSource, {
    ownerId: owner.id,
    name: 'Família',
    ...seed,
  });
  const members = [];
  for (const name of ['Bia', 'Caio']) {
    const member = await insertUser(api.dataSource, name);
    await insertMembership(api.dataSource, groupId, member.id, 'APPROVED');
    members.push({ ...member, name });
  }
  return {
    owner,
    groupId,
    cookies: await openSession(api.sessions, owner.id),
    members,
  };
}

describe('excluir grupo', () => {
  it('apaga o grupo e as participações', async () => {
    const { groupId, cookies } = await groupWithMembers();

    const response = await deleteGroup(cookies, groupId);

    expect(response.status).toBe(204);
    expect(response.text).toBe('');
    expect(await groupExists(groupId)).toBe(false);
    expect(await membershipCount(groupId)).toBe(0);
  });

  it('exclui grupo ABERTO, SORTEADO e ENCERRADO', async () => {
    for (const status of ['OPEN', 'DRAWN', 'CLOSED'] as const) {
      const { groupId, cookies } = await groupWithMembers({ status });

      const response = await deleteGroup(cookies, groupId);

      expect(response.status).toBe(204);
      expect(await groupExists(groupId)).toBe(false);
    }
  });

  it('enfileira um aviso por participante aprovado com o assunto, o texto e o botão da spec', async () => {
    const { groupId, cookies, members } = await groupWithMembers({
      name: 'Família 2026',
    });

    await deleteGroup(cookies, groupId).expect(204);

    for (const member of members) {
      expect(await emailJobsTo(member.email)).toEqual([
        {
          to: member.email,
          subject: 'O grupo Família 2026 foi excluído',
          blocks: [
            { type: 'paragraph', text: `Olá, ${member.name}.` },
            {
              type: 'paragraph',
              text: 'Ana Souza excluiu o grupo Família 2026 no Amigo Secreto. As informações do grupo foram apagadas.',
            },
            {
              type: 'button',
              label: 'Ver meus grupos',
              url: `${WEB_URL}/grupos`,
            },
          ],
        },
      ]);
    }
  });

  it('não enfileira aviso para quem organiza nem para participação pendente ou recusada', async () => {
    const { owner, groupId, cookies } = await groupWithMembers();
    const pending = await insertUser(api.dataSource, 'Pendente');
    await insertMembership(api.dataSource, groupId, pending.id, 'PENDING');
    const rejected = await insertUser(api.dataSource, 'Recusada');
    await insertMembership(api.dataSource, groupId, rejected.id, 'REJECTED');

    await deleteGroup(cookies, groupId).expect(204);

    expect(
      await emailJobsTo(owner.email, pending.email, rejected.email),
    ).toEqual([]);
  });

  it('responde 403 ao participante que não organiza e não apaga nada', async () => {
    const { groupId, members } = await groupWithMembers();

    const response = await deleteGroup(
      await openSession(api.sessions, members[0].id),
      groupId,
    );

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      statusCode: 403,
      message: 'Só quem organiza pode alterar o grupo.',
      error: 'Forbidden',
    });
    expect(await groupExists(groupId)).toBe(true);
    expect(await membershipCount(groupId)).toBe(3);
    expect(await emailJobsTo(...members.map((member) => member.email))).toEqual(
      [],
    );
  });

  it('responde 404 a grupo que não existe mais e não enfileira e-mail', async () => {
    const { groupId, cookies, members } = await groupWithMembers();
    await api.dataSource.query('DELETE FROM "group" WHERE id = $1', [groupId]);

    const response = await deleteGroup(cookies, groupId);

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({ message: 'Grupo não encontrado.' });
    expect(await emailJobsTo(...members.map((member) => member.email))).toEqual(
      [],
    );
  });

  it('exclui uma vez e responde 404 ao segundo pedido simultâneo, com os avisos enfileirados uma vez', async () => {
    const { groupId, cookies, members } = await groupWithMembers();

    const responses = await Promise.all([
      deleteGroup(cookies, groupId).then((response) => response),
      deleteGroup(cookies, groupId).then((response) => response),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([
      204, 404,
    ]);
    expect(await groupExists(groupId)).toBe(false);
    for (const member of members) {
      expect(await emailJobsTo(member.email)).toHaveLength(1);
    }
  });

  it('desfaz a exclusão e os avisos quando a gravação falha', async () => {
    const { groupId, cookies, members } = await groupWithMembers({
      name: 'Falha forçada',
    });
    await api.dataSource.query(`
      CREATE FUNCTION fail_group_delete() RETURNS trigger AS $$
      BEGIN
        IF OLD.name = 'Falha forçada' THEN
          RAISE EXCEPTION 'falha forçada na exclusão';
        END IF;
        RETURN OLD;
      END $$ LANGUAGE plpgsql`);
    await api.dataSource.query(`
      CREATE TRIGGER fail_group_delete BEFORE DELETE ON "group"
      FOR EACH ROW EXECUTE FUNCTION fail_group_delete()`);
    try {
      const response = await deleteGroup(cookies, groupId);

      expect(response.status).toBe(500);
      expect(await groupExists(groupId)).toBe(true);
      expect(await membershipCount(groupId)).toBe(3);
      expect(
        await emailJobsTo(...members.map((member) => member.email)),
      ).toEqual([]);
    } finally {
      await api.dataSource.query('DROP TRIGGER fail_group_delete ON "group"');
      await api.dataSource.query('DROP FUNCTION fail_group_delete()');
    }
  });

  it('emite group.deleted com o groupId, o status e sem dados pessoais', async () => {
    const { owner, groupId, cookies } = await groupWithMembers({
      name: 'Grupo Rastreável',
      status: 'DRAWN',
      description: 'Recado Rastreável',
      eventLocation: 'Local Rastreável',
    });

    const events = await captureEvents(() =>
      deleteGroup(cookies, groupId).expect(204),
    );

    const deleted = events.filter((record) => record.event === 'group.deleted');
    expect(deleted).toHaveLength(1);
    expect(deleted[0]).toMatchObject({
      event: 'group.deleted',
      groupId,
      status: 'DRAWN',
    });
    const line = JSON.stringify(deleted[0]);
    for (const personal of [
      'Grupo Rastreável',
      'Recado Rastreável',
      'Local Rastreável',
      'Ana Souza',
      'Bia',
      owner.email,
    ]) {
      expect(line).not.toContain(personal);
    }
  });

  it('não emite group.deleted quando a exclusão é recusada com 403 ou 404', async () => {
    const { groupId, cookies, members } = await groupWithMembers();
    const memberCookies = await openSession(api.sessions, members[0].id);

    const forbidden = await captureEvents(() =>
      deleteGroup(memberCookies, groupId).expect(403),
    );
    await api.dataSource.query('DELETE FROM "group" WHERE id = $1', [groupId]);
    const missing = await captureEvents(() =>
      deleteGroup(cookies, groupId).expect(404),
    );

    expect(forbidden.map((record) => record.event)).toEqual([]);
    expect(missing.map((record) => record.event)).toEqual([]);
  });
});
