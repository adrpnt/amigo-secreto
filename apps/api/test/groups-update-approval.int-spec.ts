import request from 'supertest';
import {
  captureEvents,
  type Cookies,
  type GroupSeed,
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
  api = await startGroupsApi('groups_update_approval');
});

afterAll(async () => {
  await stopGroupsApi(api);
});

function updateGroup(cookies: Cookies, id: string, body: object): request.Test {
  return withSession(request(api.server).put(`/groups/${id}`), cookies).send(
    body,
  );
}

async function statusOf(groupId: string, userId: string): Promise<string> {
  const [row] = await api.dataSource.query<{ status: string }[]>(
    'SELECT status FROM membership WHERE "groupId" = $1 AND "userId" = $2',
    [groupId, userId],
  );
  return row.status;
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

type Person = { id: string; email: string; name: string };

type Scenario = {
  owner: { id: string; email: string };
  groupId: string;
  cookies: Cookies;
  pending: Person[];
};

// Grupo "Família" com aprovação, organizado por "Ana Souza", com dois
// pedidos pendentes, de "Bia Lima" e "Caio Reis".
async function groupWithPending(
  seed: Partial<GroupSeed> = {},
): Promise<Scenario> {
  const owner = await insertUser(api.dataSource, 'Ana Souza');
  const groupId = await insertGroup(api.dataSource, {
    ownerId: owner.id,
    name: 'Família',
    requiresApproval: true,
    ...seed,
  });
  const pending: Person[] = [];
  for (const name of ['Bia Lima', 'Caio Reis']) {
    const person = await insertUser(api.dataSource, name);
    await insertMembership(api.dataSource, groupId, person.id, 'PENDING');
    pending.push({ ...person, name });
  }
  return {
    owner,
    groupId,
    cookies: await openSession(api.sessions, owner.id),
    pending,
  };
}

describe('desligar a aprovação', () => {
  it('aprova na mesma transação os pendentes do grupo', async () => {
    const { groupId, cookies, pending } = await groupWithPending();

    // Editar sem desligar a aprovação não aprova ninguém.
    await updateGroup(cookies, groupId, {
      name: 'Família Silva',
      requiresApproval: true,
    }).expect(200);
    for (const person of pending) {
      expect(await statusOf(groupId, person.id)).toBe('PENDING');
    }

    const response = await updateGroup(cookies, groupId, {
      name: 'Família Silva',
      requiresApproval: false,
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ requiresApproval: false });
    for (const person of pending) {
      expect(await statusOf(groupId, person.id)).toBe('APPROVED');
    }

    // Se os avisos não gravam, nem a edição nem as aprovações ficam.
    const failing = await groupWithPending({ name: 'Aprovação Falha' });
    await api.dataSource.query(`
      CREATE FUNCTION fail_approval_notice() RETURNS trigger AS $$
      BEGIN
        IF NEW.payload->>'subject' LIKE '%Aprovação Falha%' THEN
          RAISE EXCEPTION 'falha forçada nos avisos';
        END IF;
        RETURN NEW;
      END $$ LANGUAGE plpgsql`);
    await api.dataSource.query(`
      CREATE TRIGGER fail_approval_notice BEFORE INSERT ON job
      FOR EACH ROW EXECUTE FUNCTION fail_approval_notice()`);
    try {
      await updateGroup(failing.cookies, failing.groupId, {
        name: 'Aprovação Falha',
        requiresApproval: false,
      }).expect(500);
    } finally {
      await api.dataSource.query('DROP TRIGGER fail_approval_notice ON job');
      await api.dataSource.query('DROP FUNCTION fail_approval_notice()');
    }
    for (const person of failing.pending) {
      expect(await statusOf(failing.groupId, person.id)).toBe('PENDING');
    }
    const [group] = await api.dataSource.query<{ requiresApproval: boolean }[]>(
      'SELECT "requiresApproval" FROM "group" WHERE id = $1',
      [failing.groupId],
    );
    expect(group.requiresApproval).toBe(true);
  });

  it('não muda recusados nem participações de outros grupos', async () => {
    const { groupId, cookies } = await groupWithPending();
    const rejected = await insertUser(api.dataSource, 'Duda Reis');
    await insertMembership(api.dataSource, groupId, rejected.id, 'REJECTED');
    const other = await groupWithPending();

    await updateGroup(cookies, groupId, {
      name: 'Família',
      requiresApproval: false,
    }).expect(200);

    expect(await statusOf(groupId, rejected.id)).toBe('REJECTED');
    expect(await emailJobsTo(rejected.email)).toEqual([]);
    for (const person of other.pending) {
      expect(await statusOf(other.groupId, person.id)).toBe('PENDING');
    }
    expect(
      await emailJobsTo(...other.pending.map((person) => person.email)),
    ).toEqual([]);
  });

  it('enfileira o aviso de entrada aprovada a cada pessoa aprovada', async () => {
    const { owner, groupId, cookies, pending } = await groupWithPending();

    await updateGroup(cookies, groupId, {
      name: 'Família',
      requiresApproval: false,
    }).expect(200);

    for (const person of pending) {
      expect(await emailJobsTo(person.email)).toEqual([
        {
          to: person.email,
          subject: 'Você entrou no grupo Família',
          blocks: [
            { type: 'paragraph', text: `Olá, ${person.name}.` },
            {
              type: 'paragraph',
              text: 'Ana Souza aprovou sua entrada no grupo Família no Amigo Secreto.',
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
    expect(await emailJobsTo(owner.email)).toEqual([]);
  });

  it('emite membership.approved com trigger auto para cada participação', async () => {
    const { owner, groupId, cookies, pending } = await groupWithPending({
      name: 'Grupo Rastreável',
    });

    const events = await captureEvents(() =>
      updateGroup(cookies, groupId, {
        name: 'Grupo Rastreável',
        requiresApproval: false,
      }).expect(200),
    );

    const approved = events.filter(
      (record) => record.event === 'membership.approved',
    );
    expect(approved).toHaveLength(2);
    for (const record of approved) {
      expect(record).toMatchObject({
        event: 'membership.approved',
        groupId,
        trigger: 'auto',
      });
      const line = JSON.stringify(record);
      for (const personal of [
        'Grupo Rastreável',
        'Ana Souza',
        owner.id,
        owner.email,
        ...pending.flatMap((person) => [person.id, person.email, person.name]),
      ]) {
        expect(line).not.toContain(personal);
      }
    }
  });

  it('não aprova nada quando a edição é recusada', async () => {
    const invalid = await groupWithPending();
    const forbidden = await groupWithPending();
    const member = await insertUser(api.dataSource, 'Eva Lima');
    await insertMembership(
      api.dataSource,
      forbidden.groupId,
      member.id,
      'APPROVED',
    );
    const memberCookies = await openSession(api.sessions, member.id);
    const closed = await groupWithPending({ status: 'CLOSED' });

    const events = await captureEvents(async () => {
      await updateGroup(invalid.cookies, invalid.groupId, {
        name: '',
        requiresApproval: false,
      }).expect(400);
      await updateGroup(memberCookies, forbidden.groupId, {
        name: 'Família',
        requiresApproval: false,
      }).expect(403);
      await updateGroup(closed.cookies, closed.groupId, {
        name: 'Família',
        requiresApproval: false,
      }).expect(409);
    });

    for (const scenario of [invalid, forbidden, closed]) {
      for (const person of scenario.pending) {
        expect(await statusOf(scenario.groupId, person.id)).toBe('PENDING');
        expect(await emailJobsTo(person.email)).toEqual([]);
      }
    }
    expect(
      events.filter((record) => record.event === 'membership.approved'),
    ).toEqual([]);
  });
});
