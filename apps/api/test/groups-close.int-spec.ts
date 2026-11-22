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

type GroupState = { status: string; closedAt: Date | null; updatedAt: Date };

let api: GroupsApi;

beforeAll(async () => {
  api = await startGroupsApi('groups_close');
});

afterAll(async () => {
  await stopGroupsApi(api);
});

function closeGroup(cookies: Cookies, id: string): request.Test {
  return withSession(request(api.server).post(`/groups/${id}/close`), cookies);
}

async function groupState(id: string): Promise<GroupState> {
  const [row] = await api.dataSource.query<GroupState[]>(
    'SELECT status, "closedAt", "updatedAt" FROM "group" WHERE id = $1',
    [id],
  );
  return row;
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

// Grupo posto em SORTEADO direto no banco, com quem organiza ("Ana Souza") e
// dois participantes aprovados, "Bia" e "Caio".
async function drawnGroupWithMembers(
  seed: Partial<Parameters<typeof insertGroup>[1]> = {},
): Promise<Scenario> {
  const owner = await insertUser(api.dataSource, 'Ana Souza');
  const groupId = await insertGroup(api.dataSource, {
    ownerId: owner.id,
    name: 'Família',
    status: 'DRAWN',
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

describe('encerrar grupo', () => {
  it('passa o grupo SORTEADO para ENCERRADO e grava a data do encerramento', async () => {
    const { owner, groupId, cookies } = await drawnGroupWithMembers();
    const before = Date.now();

    const response = await closeGroup(cookies, groupId);

    const after = Date.now();
    expect(response.status).toBe(200);
    const state = await groupState(groupId);
    expect(state.status).toBe('CLOSED');
    expect(state.closedAt).toBeInstanceOf(Date);
    expect(state.closedAt!.getTime()).toBeGreaterThanOrEqual(before - 1000);
    expect(state.closedAt!.getTime()).toBeLessThanOrEqual(after + 1000);
    expect(response.body).toMatchObject({
      id: groupId,
      status: 'CLOSED',
      closedAt: state.closedAt!.toISOString(),
      owner: { id: owner.id, name: 'Ana Souza' },
      isOrganizer: true,
    });
  });

  it('responde 409 em grupo ABERTO ou ENCERRADO e não muda o grupo', async () => {
    for (const status of ['OPEN', 'CLOSED'] as const) {
      const { groupId, cookies, members } = await drawnGroupWithMembers({
        status,
      });
      const before = await groupState(groupId);

      const response = await closeGroup(cookies, groupId);

      expect(response.status).toBe(409);
      expect(response.body).toEqual({
        statusCode: 409,
        message: 'Só um grupo sorteado pode ser encerrado.',
        error: 'Conflict',
      });
      expect(await groupState(groupId)).toEqual(before);
      expect(
        await emailJobsTo(...members.map((member) => member.email)),
      ).toEqual([]);
    }
  });

  it('responde 403 ao participante que não organiza e não muda o grupo', async () => {
    const { groupId, members } = await drawnGroupWithMembers();
    const before = await groupState(groupId);

    const response = await closeGroup(
      await openSession(api.sessions, members[0].id),
      groupId,
    );

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      statusCode: 403,
      message: 'Só quem organiza pode alterar o grupo.',
      error: 'Forbidden',
    });
    expect(await groupState(groupId)).toEqual(before);
    expect(await emailJobsTo(...members.map((member) => member.email))).toEqual(
      [],
    );
  });

  it('enfileira um aviso por participante aprovado com o assunto, o texto e o botão da spec', async () => {
    const { groupId, cookies, members } = await drawnGroupWithMembers({
      name: 'Família 2026',
    });

    await closeGroup(cookies, groupId).expect(200);

    for (const member of members) {
      expect(await emailJobsTo(member.email)).toEqual([
        {
          to: member.email,
          subject: 'O grupo Família 2026 foi encerrado',
          blocks: [
            { type: 'paragraph', text: `Olá, ${member.name}.` },
            {
              type: 'paragraph',
              text: 'Ana Souza encerrou o grupo Família 2026 no Amigo Secreto. Ele continua em Meus grupos, na seção Encerrados.',
            },
            {
              type: 'button',
              label: 'Ver grupo',
              url: `${WEB_URL}/grupos/${groupId}`,
            },
          ],
        },
      ]);
    }
  });

  it('não enfileira aviso para quem organiza nem para participação pendente ou recusada', async () => {
    const { owner, groupId, cookies } = await drawnGroupWithMembers();
    const pending = await insertUser(api.dataSource, 'Pendente');
    await insertMembership(api.dataSource, groupId, pending.id, 'PENDING');
    const rejected = await insertUser(api.dataSource, 'Recusada');
    await insertMembership(api.dataSource, groupId, rejected.id, 'REJECTED');

    await closeGroup(cookies, groupId).expect(200);

    expect(
      await emailJobsTo(owner.email, pending.email, rejected.email),
    ).toEqual([]);
  });

  it('encerra uma vez e responde 409 ao segundo pedido simultâneo, com os avisos enfileirados uma vez', async () => {
    const { groupId, cookies, members } = await drawnGroupWithMembers();

    const responses = await Promise.all([
      closeGroup(cookies, groupId).then((response) => response),
      closeGroup(cookies, groupId).then((response) => response),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([
      200, 409,
    ]);
    expect((await groupState(groupId)).status).toBe('CLOSED');
    for (const member of members) {
      expect(await emailJobsTo(member.email)).toHaveLength(1);
    }
  });

  it('emite group.closed com trigger manual e sem dados pessoais', async () => {
    const { owner, groupId, cookies } = await drawnGroupWithMembers({
      name: 'Grupo Rastreável',
      description: 'Recado Rastreável',
      eventLocation: 'Local Rastreável',
    });

    const events = await captureEvents(() =>
      closeGroup(cookies, groupId).expect(200),
    );

    const closed = events.filter((record) => record.event === 'group.closed');
    expect(closed).toHaveLength(1);
    expect(closed[0]).toMatchObject({
      event: 'group.closed',
      groupId,
      trigger: 'manual',
    });
    const line = JSON.stringify(closed[0]);
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

  it('não emite group.closed quando o encerramento é recusado com 403 ou 409', async () => {
    const { groupId, members } = await drawnGroupWithMembers();
    const memberCookies = await openSession(api.sessions, members[0].id);
    const open = await drawnGroupWithMembers({ status: 'OPEN' });

    const forbidden = await captureEvents(() =>
      closeGroup(memberCookies, groupId).expect(403),
    );
    const conflict = await captureEvents(() =>
      closeGroup(open.cookies, open.groupId).expect(409),
    );

    expect(forbidden.map((record) => record.event)).toEqual([]);
    expect(conflict.map((record) => record.event)).toEqual([]);
  });
});
