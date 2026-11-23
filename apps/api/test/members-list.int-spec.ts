import { randomUUID } from 'node:crypto';
import request from 'supertest';
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

type Item = {
  membershipId: string;
  name: string;
  avatarUrl: string | null;
  status: string;
  isOrganizer: boolean;
};

type Page = { items: Item[]; nextCursor: string | null; approvedCount: number };

type Status = 'PENDING' | 'APPROVED' | 'REJECTED';

let api: GroupsApi;

beforeAll(async () => {
  api = await startGroupsApi('members_list');
});

afterAll(async () => {
  await stopGroupsApi(api);
});

async function signedIn(
  name: string,
): Promise<{ id: string; email: string; cookies: Cookies }> {
  const user = await insertUser(api.dataSource, name);
  return { ...user, cookies: await openSession(api.sessions, user.id) };
}

// Grupo com quem organiza e as outras pessoas, gravados direto no banco.
async function groupWith(
  ownerName: string,
  people: [name: string, status: Status][],
): Promise<{
  groupId: string;
  owner: { id: string; email: string; cookies: Cookies };
  emails: string[];
}> {
  const owner = await signedIn(ownerName);
  const groupId = await insertGroup(api.dataSource, {
    ownerId: owner.id,
    requiresApproval: true,
  });
  const emails = [owner.email];
  for (const [name, status] of people) {
    const user = await insertUser(api.dataSource, name);
    await insertMembership(api.dataSource, groupId, user.id, status);
    emails.push(user.email);
  }
  return { groupId, owner, emails };
}

async function joinAs(
  groupId: string,
  name: string,
  status: Status = 'APPROVED',
): Promise<{ id: string; cookies: Cookies }> {
  const person = await signedIn(name);
  await insertMembership(api.dataSource, groupId, person.id, status);
  return person;
}

function listRequest(
  groupId: string,
  cookies: Cookies,
  query: Record<string, string> = {},
): request.Test {
  return withSession(
    request(api.server).get(`/groups/${groupId}/members`).query(query),
    cookies,
  );
}

async function list(
  groupId: string,
  cookies: Cookies,
  query: Record<string, string> = {},
): Promise<Page> {
  const response = await listRequest(groupId, cookies, query);
  expect(response.status).toBe(200);
  return response.body as Page;
}

// Segue os cursores até a última página.
async function allPages(
  groupId: string,
  cookies: Cookies,
  query: Record<string, string> = {},
): Promise<Page[]> {
  const pages = [await list(groupId, cookies, query)];
  while (pages[pages.length - 1].nextCursor !== null) {
    const cursor = pages[pages.length - 1].nextCursor!;
    pages.push(await list(groupId, cookies, { ...query, cursor }));
  }
  return pages;
}

function names(items: Item[]): string[] {
  return items.map((item) => item.name);
}

function numbered(prefix: string, count: number): string[] {
  return Array.from(
    { length: count },
    (_, index) => `${prefix} ${String(index + 1).padStart(2, '0')}`,
  );
}

// Id da participação de cada pessoa do grupo, pelo nome.
async function membershipIds(groupId: string): Promise<Record<string, string>> {
  const rows = await api.dataSource.query<{ id: string; name: string }[]>(
    `SELECT m.id, u.name FROM membership m JOIN "user" u ON u.id = m."userId"
     WHERE m."groupId" = $1`,
    [groupId],
  );
  return Object.fromEntries(rows.map((row) => [row.name, row.id]));
}

function encodeCursor(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

describe('lista de participantes', () => {
  it('participante aprovado recebe só os aprovados em ordem alfabética, com avatar e Organiza', async () => {
    const { groupId, owner } = await groupWith('Marta Dias', [
      ['Bia Lima', 'APPROVED'],
      ['Ana Pendente', 'PENDING'],
      ['Aldo Recusado', 'REJECTED'],
    ]);
    await api.dataSource.query(
      `UPDATE "user" SET "avatarUrl" = $2 WHERE id = $1`,
      [owner.id, 'https://exemplo.com/marta.png'],
    );
    const member = await joinAs(groupId, 'Caio Reis');

    const page = await list(groupId, member.cookies);
    const ids = await membershipIds(groupId);

    expect(page.items).toEqual([
      {
        membershipId: ids['Bia Lima'],
        name: 'Bia Lima',
        avatarUrl: null,
        status: 'APPROVED',
        isOrganizer: false,
      },
      {
        membershipId: ids['Caio Reis'],
        name: 'Caio Reis',
        avatarUrl: null,
        status: 'APPROVED',
        isOrganizer: false,
      },
      {
        membershipId: ids['Marta Dias'],
        name: 'Marta Dias',
        avatarUrl: 'https://exemplo.com/marta.png',
        status: 'APPROVED',
        isOrganizer: true,
      },
    ]);
    expect(page.nextCursor).toBeNull();
  });

  it('quem organiza recebe pendentes, aprovados por nome e recusados por último', async () => {
    const { groupId, owner } = await groupWith('Marta Dias', [
      ['Pedro Alves', 'PENDING'],
      ['Caio Reis', 'APPROVED'],
      ['Bruno Costa', 'REJECTED'],
      ['Lara Melo', 'PENDING'],
      ['Ana Souza', 'APPROVED'],
      ['Alice Neves', 'REJECTED'],
    ]);

    const page = await list(groupId, owner.cookies);

    expect(
      page.items.map(({ name, status, isOrganizer }) => ({
        name,
        status,
        isOrganizer,
      })),
    ).toEqual([
      { name: 'Lara Melo', status: 'PENDING', isOrganizer: false },
      { name: 'Pedro Alves', status: 'PENDING', isOrganizer: false },
      { name: 'Ana Souza', status: 'APPROVED', isOrganizer: false },
      { name: 'Caio Reis', status: 'APPROVED', isOrganizer: false },
      { name: 'Marta Dias', status: 'APPROVED', isOrganizer: true },
      { name: 'Alice Neves', status: 'REJECTED', isOrganizer: false },
      { name: 'Bruno Costa', status: 'REJECTED', isOrganizer: false },
    ]);
  });

  it('traz 20 por vez e o cursor leva aos seguintes sem pular nem repetir', async () => {
    const people = numbered('Pessoa', 44);
    const { groupId, owner } = await groupWith(
      'Ana Souza',
      [...people].reverse().map((name) => [name, 'APPROVED']),
    );

    const pages = await allPages(groupId, owner.cookies);

    expect(pages.map((page) => page.items.length)).toEqual([20, 20, 5]);
    expect(pages[0].nextCursor).toEqual(expect.any(String));
    expect(pages[1].nextCursor).toEqual(expect.any(String));
    expect(pages[2].nextCursor).toBeNull();
    const items = pages.flatMap((page) => page.items);
    expect(names(items)).toEqual(['Ana Souza', ...people]);
    expect(new Set(items.map((item) => item.membershipId)).size).toBe(45);
  });

  it('com 20 visíveis não devolve cursor e com 21 devolve', async () => {
    const { groupId, owner } = await groupWith(
      'Ana Souza',
      numbered('Pessoa', 19).map((name) => [name, 'APPROVED']),
    );

    const twenty = await list(groupId, owner.cookies);

    expect(twenty.items).toHaveLength(20);
    expect(twenty.nextCursor).toBeNull();

    await joinAs(groupId, 'Pessoa 20', 'PENDING');
    const first = await list(groupId, owner.cookies);
    const second = await list(groupId, owner.cookies, {
      cursor: first.nextCursor!,
    });

    expect(first.items).toHaveLength(20);
    expect(first.nextCursor).toEqual(expect.any(String));
    expect(second.items).toHaveLength(1);
    expect(second.nextCursor).toBeNull();
  });

  it('aprovar alguém com a lista aberta não pula nem repete ninguém na página seguinte', async () => {
    const approved = numbered('Pessoa', 30);
    const { groupId, owner } = await groupWith('Pessoa 00', [
      ['Beatriz Nova', 'PENDING'],
      ['Carla Nova', 'PENDING'],
      ['Zélia Nova', 'PENDING'],
      ...approved.map((name): [string, Status] => [name, 'APPROVED']),
    ]);

    const first = await list(groupId, owner.cookies);
    expect(names(first.items)).toEqual([
      'Beatriz Nova',
      'Carla Nova',
      'Zélia Nova',
      'Pessoa 00',
      ...approved.slice(0, 16),
    ]);
    const [beatriz, carla, zelia] = first.items;

    // Com a primeira página aberta, Beatriz passa a aprovada antes do fim
    // dela ("Pessoa 16") e Zélia, depois.
    await api.dataSource.query(
      `UPDATE membership SET status = 'APPROVED' WHERE id = ANY($1)`,
      [[beatriz.membershipId, zelia.membershipId]],
    );
    const second = await list(groupId, owner.cookies, {
      cursor: first.nextCursor!,
    });

    // Ninguém sem mudança pula nem repete; Zélia aparece uma vez na
    // segunda página, no lugar novo.
    expect(names(second.items)).toEqual([...approved.slice(16), 'Zélia Nova']);
    expect(second.items[second.items.length - 1]).toMatchObject({
      membershipId: zelia.membershipId,
      status: 'APPROVED',
    });
    const seen = [...first.items, ...second.items].map(
      (item) => item.membershipId,
    );
    const unchanged = seen.filter((id) => id !== zelia.membershipId);
    expect(new Set(unchanged).size).toBe(unchanged.length);
    expect(unchanged).toHaveLength(33);
    expect(unchanged).toContain(beatriz.membershipId);
    expect(unchanged).toContain(carla.membershipId);
    expect(seen.filter((id) => id === zelia.membershipId)).toHaveLength(2);
  });

  it('busca pelo nome sem diferenciar maiúsculas nem acentos, na mesma ordem e paginação', async () => {
    const matching = numbered('Joao', 22).map((name, index) =>
      index % 2 === 0 ? name.replace('Joao', 'João') : name.toUpperCase(),
    );
    const { groupId, owner } = await groupWith('Bia Lima', [
      ...[...matching]
        .reverse()
        .map((name): [string, Status] => [name, 'APPROVED']),
      ['Joana Prado', 'APPROVED'],
      ['Maria Joãozinha', 'PENDING'],
    ]);

    const pages = await allPages(groupId, owner.cookies, { search: 'joao' });

    expect(pages.map((page) => page.items.length)).toEqual([20, 3]);
    expect(names(pages.flatMap((page) => page.items))).toEqual([
      'Maria Joãozinha',
      ...matching,
    ]);

    const accented = await allPages(groupId, owner.cookies, {
      search: 'JOÃO',
    });

    expect(accented.flatMap((page) => page.items)).toEqual(
      pages.flatMap((page) => page.items),
    );
  });

  it('trata % e _ da busca como texto', async () => {
    const { groupId, owner } = await groupWith('Organizadora', [
      ['Ana 100%', 'APPROVED'],
      ['Ana_Beta', 'APPROVED'],
      ['Ana Beta', 'APPROVED'],
      ['Bia Lima', 'APPROVED'],
    ]);

    const percent = await list(groupId, owner.cookies, { search: '%' });
    const underscore = await list(groupId, owner.cookies, { search: '_' });
    const pattern = await list(groupId, owner.cookies, { search: 'a_b' });

    expect(names(percent.items)).toEqual(['Ana 100%']);
    expect(names(underscore.items)).toEqual(['Ana_Beta']);
    expect(names(pattern.items)).toEqual(['Ana_Beta']);
  });

  it('devolve lista vazia quando a busca não encontra ninguém', async () => {
    const { groupId, owner } = await groupWith('Ana Souza', [
      ['Bia Lima', 'APPROVED'],
      ['Caio Reis', 'PENDING'],
    ]);

    const page = await list(groupId, owner.cookies, { search: 'Xavier' });

    expect(page).toEqual({ items: [], nextCursor: null, approvedCount: 2 });
  });

  it('não devolve o e-mail de ninguém', async () => {
    const { groupId, owner, emails } = await groupWith('Ana Souza', [
      ['Bia Lima', 'APPROVED'],
      ['Caio Reis', 'PENDING'],
      ['Duda Melo', 'REJECTED'],
    ]);

    const response = await listRequest(groupId, owner.cookies);

    expect(response.status).toBe(200);
    const body = response.body as Page;
    expect(body.items).toHaveLength(4);
    for (const item of body.items) {
      expect(Object.keys(item).sort()).toEqual([
        'avatarUrl',
        'isOrganizer',
        'membershipId',
        'name',
        'status',
      ]);
    }
    for (const email of emails) {
      expect(response.text).not.toContain(email);
    }
  });

  it('devolve o total de aprovados sem a busca', async () => {
    const { groupId, owner } = await groupWith('Ana Souza', [
      ['Bia Lima', 'APPROVED'],
      ['Caio Reis', 'APPROVED'],
      ['Duda Melo', 'PENDING'],
      ['Eva Rocha', 'PENDING'],
      ['Fábio Luz', 'REJECTED'],
    ]);
    const member = await joinAs(groupId, 'Gabi Torres');

    const ownerSearch = await list(groupId, owner.cookies, { search: 'Bia' });
    const memberSearch = await list(groupId, member.cookies, {
      search: 'Duda',
    });
    const memberAll = await list(groupId, member.cookies);

    expect(names(ownerSearch.items)).toEqual(['Bia Lima']);
    expect(ownerSearch.approvedCount).toBe(4);
    expect(memberSearch.items).toEqual([]);
    expect(memberSearch.approvedCount).toBe(4);
    expect(memberAll.approvedCount).toBe(4);
  });

  it('responde 404 Grupo não encontrado. a quem não participa, a pendente e a id inexistente', async () => {
    const { groupId } = await groupWith('Ana Souza', [
      ['Bia Lima', 'APPROVED'],
    ]);
    const outsider = await signedIn('Caio Reis');
    const pending = await joinAs(groupId, 'Duda Melo', 'PENDING');
    const member = await joinAs(groupId, 'Eva Rocha');

    const responses = [
      await listRequest(groupId, outsider.cookies),
      await listRequest(groupId, pending.cookies),
      await listRequest(randomUUID(), member.cookies),
    ];

    for (const response of responses) {
      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        statusCode: 404,
        message: 'Grupo não encontrado.',
        error: 'Not Found',
      });
    }
  });

  it('não mostra pendentes nem recusados a quem não organiza', async () => {
    const { groupId } = await groupWith('Ana Souza', [
      ['Bia Lima', 'PENDING'],
      ['Caio Reis', 'REJECTED'],
      ['Duda Melo', 'APPROVED'],
    ]);
    const member = await joinAs(groupId, 'Eva Rocha');

    const page = await list(groupId, member.cookies);
    const pendingSearch = await list(groupId, member.cookies, {
      search: 'Bia',
    });
    const rejectedSearch = await list(groupId, member.cookies, {
      search: 'Caio',
    });

    expect(names(page.items)).toEqual(['Ana Souza', 'Duda Melo', 'Eva Rocha']);
    expect(page.items.every((item) => item.status === 'APPROVED')).toBe(true);
    expect(pendingSearch.items).toEqual([]);
    expect(rejectedSearch.items).toEqual([]);
  });

  it('responde 400 a cursor inválido', async () => {
    const { groupId, owner } = await groupWith('Ana Souza', [
      ['Bia Lima', 'APPROVED'],
    ]);
    const cursors = [
      'não-é-cursor',
      encodeCursor({ rank: 1 }),
      encodeCursor([5, 'bia lima', randomUUID()]),
      encodeCursor([1, 'bia lima', 'não-é-uuid']),
      encodeCursor([1, 2, randomUUID()]),
    ];

    for (const cursor of cursors) {
      const response = await listRequest(groupId, owner.cookies, { cursor });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        statusCode: 400,
        message: 'Dados inválidos.',
        error: 'Bad Request',
      });
    }
  });

  it('ordena nomes com acento junto dos sem acento', async () => {
    const { groupId, owner } = await groupWith('Zeca Lima', [
      ['Ítalo Reis', 'APPROVED'],
      ['Eduardo Melo', 'APPROVED'],
      ['Ana Souza', 'APPROVED'],
      ['Élida Costa', 'APPROVED'],
      ['Igor Prado', 'APPROVED'],
      ['Álvaro Dias', 'APPROVED'],
      ['Bruno Luz', 'APPROVED'],
    ]);

    const page = await list(groupId, owner.cookies);

    expect(names(page.items)).toEqual([
      'Álvaro Dias',
      'Ana Souza',
      'Bruno Luz',
      'Eduardo Melo',
      'Élida Costa',
      'Igor Prado',
      'Ítalo Reis',
      'Zeca Lima',
    ]);
  });
});
