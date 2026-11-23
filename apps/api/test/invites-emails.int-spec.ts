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
const LIMIT_PREFIX =
  'Este grupo chegou ao limite de 100 convites por e-mail em 24 horas. Tente de novo em';

type EmailJob = {
  to: string;
  subject: string;
  blocks: { type: string; text?: string; label?: string; url?: string }[];
};

type EmailInviteRow = { groupId: string; email: string; createdAt: Date };

let api: GroupsApi;

beforeAll(async () => {
  api = await startGroupsApi('invites_emails');
});

afterAll(async () => {
  await stopGroupsApi(api);
});

function sendInvites(
  cookies: Cookies,
  groupId: string,
  emails: string,
): request.Test {
  return withSession(
    request(api.server).post(`/groups/${groupId}/invite/emails`),
    cookies,
  ).send({ emails });
}

function invalidFields(message: string) {
  return {
    statusCode: 400,
    message: 'Dados inválidos.',
    error: 'Bad Request',
    fields: { emails: message },
  };
}

async function inviteJobsOf(groupId: string): Promise<EmailJob[]> {
  const [{ inviteCode }] = await api.dataSource.query<{ inviteCode: string }[]>(
    'SELECT "inviteCode" FROM "group" WHERE id = $1',
    [groupId],
  );
  const rows = await api.dataSource.query<{ payload: EmailJob }[]>(
    `SELECT payload FROM job
     WHERE type = 'email.send' AND payload::text LIKE $1
     ORDER BY "createdAt", id`,
    [`%/convite/${inviteCode}%`],
  );
  return rows.map((row) => row.payload);
}

async function emailInvitesOf(groupId: string): Promise<EmailInviteRow[]> {
  return api.dataSource.query<EmailInviteRow[]>(
    `SELECT "groupId", email, "createdAt" FROM email_invite
     WHERE "groupId" = $1 ORDER BY "createdAt", email`,
    [groupId],
  );
}

// Envios já gravados, como se tivessem saído há `age` (intervalo do Postgres).
async function seedEmailInvites(
  groupId: string,
  count: number,
  age: string,
): Promise<void> {
  await api.dataSource.query(
    `INSERT INTO email_invite ("groupId", email, "createdAt")
     SELECT $1, 'semente' || n || '@exemplo.com', now() - $2::interval
     FROM generate_series(1, $3) AS n`,
    [groupId, age, count],
  );
}

type Scenario = {
  owner: { id: string; email: string };
  groupId: string;
  cookies: Cookies;
};

// Grupo "Família" organizado por "Ana Souza", com a sessão dela.
async function organizedGroup(
  seed: Partial<GroupSeed> = {},
): Promise<Scenario> {
  const owner = await insertUser(api.dataSource, 'Ana Souza');
  const groupId = await insertGroup(api.dataSource, {
    ownerId: owner.id,
    name: 'Família',
    ...seed,
  });
  return {
    owner,
    groupId,
    cookies: await openSession(api.sessions, owner.id),
  };
}

function distinctEmails(count: number): string[] {
  return Array.from({ length: count }, (_, i) => `pessoa${i + 1}@exemplo.com`);
}

async function expectNothingSent(groupId: string): Promise<void> {
  expect(await inviteJobsOf(groupId)).toEqual([]);
  expect(await emailInvitesOf(groupId)).toEqual([]);
}

describe('convidar por e-mail', () => {
  it('enfileira um convite por endereço distinto com o link do grupo e grava cada envio', async () => {
    const { groupId, cookies } = await organizedGroup();
    const [{ inviteCode }] = await api.dataSource.query<
      { inviteCode: string }[]
    >('SELECT "inviteCode" FROM "group" WHERE id = $1', [groupId]);
    const before = Date.now();

    await sendInvites(
      cookies,
      groupId,
      'Bia@Exemplo.com, bia@exemplo.com;\nCAIO@exemplo.com',
    ).expect(200);

    const after = Date.now();
    const invite = (to: string): EmailJob => ({
      to,
      subject: 'Ana Souza convidou você para o amigo secreto Família',
      blocks: [
        { type: 'paragraph', text: 'Olá.' },
        {
          type: 'paragraph',
          text: 'Ana Souza convidou você para participar do amigo secreto Família. Para entrar, você vai precisar de uma conta no Amigo Secreto.',
        },
        {
          type: 'button',
          label: 'Ver convite',
          url: `${WEB_URL}/convite/${inviteCode}`,
        },
      ],
    });
    const jobs = await inviteJobsOf(groupId);
    expect(jobs).toHaveLength(2);
    expect(jobs).toEqual(
      expect.arrayContaining([
        invite('bia@exemplo.com'),
        invite('caio@exemplo.com'),
      ]),
    );
    const sends = await emailInvitesOf(groupId);
    expect(sends.map((send) => [send.groupId, send.email]).sort()).toEqual([
      [groupId, 'bia@exemplo.com'],
      [groupId, 'caio@exemplo.com'],
    ]);
    for (const send of sends) {
      expect(send.createdAt.getTime()).toBeGreaterThanOrEqual(before - 1000);
      expect(send.createdAt.getTime()).toBeLessThanOrEqual(after + 1000);
    }
  });

  it('devolve a quantidade de e-mails enviados', async () => {
    const { groupId, cookies } = await organizedGroup();

    const one = await sendInvites(cookies, groupId, 'bia@exemplo.com');
    const three = await sendInvites(
      cookies,
      groupId,
      'caio@exemplo.com dani@exemplo.com, Caio@Exemplo.com; eva@exemplo.com',
    );

    expect(one.status).toBe(200);
    expect(one.body).toEqual({ count: 1 });
    expect(three.status).toBe(200);
    expect(three.body).toEqual({ count: 3 });
  });

  it('recusa com 400 e a lista dos inválidos sem enviar nenhum', async () => {
    const { groupId, cookies } = await organizedGroup();

    const response = await sendInvites(
      cookies,
      groupId,
      'ana@exemplo.com, Joao@, maria.com; joao@',
    );

    expect(response.status).toBe(400);
    expect(response.body).toEqual(
      invalidFields('Confira estes e-mails: Joao@, maria.com'),
    );
    await expectNothingSent(groupId);
  });

  it('recusa com 400 endereço que o isEmail da API recusa', async () => {
    const { groupId, cookies } = await organizedGroup();

    const response = await sendInvites(
      cookies,
      groupId,
      'ana@exemplo.com, Bia@Exemplo.c, joao@; ana..b@exemplo.com',
    );

    expect(response.status).toBe(400);
    expect(response.body).toEqual(
      invalidFields(
        'Confira estes e-mails: Bia@Exemplo.c, joao@, ana..b@exemplo.com',
      ),
    );
    await expectNothingSent(groupId);
  });

  it('aceita 20 endereços distintos e recusa 21 sem enviar nenhum', async () => {
    const accepted = await organizedGroup();
    const refused = await organizedGroup();

    const twenty = await sendInvites(
      accepted.cookies,
      accepted.groupId,
      distinctEmails(20).join(', '),
    );
    const twentyOne = await sendInvites(
      refused.cookies,
      refused.groupId,
      distinctEmails(21).join(', '),
    );

    expect(twenty.status).toBe(200);
    expect(twenty.body).toEqual({ count: 20 });
    expect(await inviteJobsOf(accepted.groupId)).toHaveLength(20);
    expect(twentyOne.status).toBe(400);
    expect(twentyOne.body).toEqual(
      invalidFields('Envie no máximo 20 e-mails por vez.'),
    );
    await expectNothingSent(refused.groupId);
  });

  it('recusa com 400 o campo vazio', async () => {
    const { groupId, cookies } = await organizedGroup();

    for (const emails of ['', ' ,; \n ']) {
      const response = await sendInvites(cookies, groupId, emails);

      expect(response.status).toBe(400);
      expect(response.body).toEqual(
        invalidFields('Informe pelo menos um e-mail.'),
      );
    }
    await expectNothingSent(groupId);
  });

  it('aceita o envio que chega a 100 em 24 horas e recusa com 429 o que passaria, sem enviar nenhum', async () => {
    const { groupId, cookies } = await organizedGroup();
    await seedEmailInvites(groupId, 95, '1 hour');

    const six = await sendInvites(cookies, groupId, distinctEmails(6).join());

    expect(six.status).toBe(429);
    expect(six.body).toEqual({
      statusCode: 429,
      message: `${LIMIT_PREFIX} 23 horas.`,
      error: 'Too Many Requests',
    });
    expect(Number(six.headers['retry-after'])).toBeGreaterThan(82_000);
    expect(Number(six.headers['retry-after'])).toBeLessThanOrEqual(82_800);
    expect(await inviteJobsOf(groupId)).toEqual([]);
    expect(await emailInvitesOf(groupId)).toHaveLength(95);

    const five = await sendInvites(cookies, groupId, distinctEmails(5).join());

    expect(five.status).toBe(200);
    expect(five.body).toEqual({ count: 5 });
    expect(await emailInvitesOf(groupId)).toHaveLength(100);

    const one = await sendInvites(cookies, groupId, 'mais@exemplo.com');

    expect(one.status).toBe(429);
    expect(await inviteJobsOf(groupId)).toHaveLength(5);
    expect(await emailInvitesOf(groupId)).toHaveLength(100);
  });

  it('volta a aceitar quando o envio mais antigo sai da janela de 24 horas', async () => {
    const { groupId, cookies } = await organizedGroup();
    await seedEmailInvites(groupId, 1, '23 hours 59 minutes 30 seconds');
    await seedEmailInvites(groupId, 99, '1 hour');

    const blocked = await sendInvites(cookies, groupId, 'bia@exemplo.com');

    expect(blocked.status).toBe(429);
    expect(blocked.body).toEqual({
      statusCode: 429,
      message: `${LIMIT_PREFIX} 1 minuto.`,
      error: 'Too Many Requests',
    });

    // O tempo passa: o envio mais antigo sai da janela.
    await api.dataSource.query(
      `UPDATE email_invite SET "createdAt" = now() - interval '24 hours 1 second'
       WHERE "groupId" = $1 AND "createdAt" < now() - interval '23 hours'`,
      [groupId],
    );

    const accepted = await sendInvites(cookies, groupId, 'bia@exemplo.com');

    expect(accepted.status).toBe(200);
    expect(accepted.body).toEqual({ count: 1 });
    expect(await inviteJobsOf(groupId)).toHaveLength(1);
  });

  it('responde 409 com o grupo SORTEADO ou ENCERRADO sem enviar', async () => {
    for (const status of ['DRAWN', 'CLOSED'] as const) {
      const { groupId, cookies } = await organizedGroup({ status });

      const response = await sendInvites(cookies, groupId, 'bia@exemplo.com');

      expect(response.status).toBe(409);
      expect(response.body).toEqual({
        statusCode: 409,
        message: 'Com o sorteio feito, ninguém entra nem sai do grupo.',
        error: 'Conflict',
      });
      await expectNothingSent(groupId);
    }
  });

  it('responde 403 a participante que não organiza sem enviar', async () => {
    const { groupId } = await organizedGroup();
    const member = await insertUser(api.dataSource, 'Bia Lima');
    await insertMembership(api.dataSource, groupId, member.id, 'APPROVED');
    const cookies = await openSession(api.sessions, member.id);

    const response = await sendInvites(cookies, groupId, 'caio@exemplo.com');

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      statusCode: 403,
      message: 'Só quem organiza pode alterar o grupo.',
      error: 'Forbidden',
    });
    await expectNothingSent(groupId);
  });

  it('envia também para quem já participa', async () => {
    const { owner, groupId, cookies } = await organizedGroup();
    const member = await insertUser(api.dataSource, 'Bia Lima');
    await insertMembership(api.dataSource, groupId, member.id, 'APPROVED');

    const response = await sendInvites(
      cookies,
      groupId,
      `${member.email}, ${owner.email}`,
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ count: 2 });
    expect((await inviteJobsOf(groupId)).map((job) => job.to).sort()).toEqual(
      [member.email, owner.email].sort(),
    );
  });

  it('emite invite.emails_sent com count e sem e-mails', async () => {
    const { owner, groupId, cookies } = await organizedGroup({
      name: 'Grupo Rastreável',
    });

    const events = await captureEvents(() =>
      sendInvites(
        cookies,
        groupId,
        'rastreavel@exemplo.com, outra.pessoa@exemplo.com',
      ).expect(200),
    );

    const sent = events.filter(
      (record) => record.event === 'invite.emails_sent',
    );
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({
      event: 'invite.emails_sent',
      groupId,
      count: 2,
    });
    const line = JSON.stringify(sent[0]);
    for (const personal of [
      'rastreavel@exemplo.com',
      'outra.pessoa@exemplo.com',
      'Grupo Rastreável',
      'Ana Souza',
      owner.id,
      owner.email,
    ]) {
      expect(line).not.toContain(personal);
    }
  });

  it('não emite invite.emails_sent quando o envio é recusado', async () => {
    const open = await organizedGroup();
    const drawn = await organizedGroup({ status: 'DRAWN' });
    const full = await organizedGroup();
    await seedEmailInvites(full.groupId, 100, '1 hour');
    const member = await insertUser(api.dataSource, 'Bia Lima');
    await insertMembership(api.dataSource, open.groupId, member.id, 'APPROVED');
    const memberCookies = await openSession(api.sessions, member.id);

    const events = await captureEvents(async () => {
      await sendInvites(open.cookies, open.groupId, 'joao@').expect(400);
      await sendInvites(memberCookies, open.groupId, 'a@exemplo.com').expect(
        403,
      );
      await sendInvites(drawn.cookies, drawn.groupId, 'a@exemplo.com').expect(
        409,
      );
      await sendInvites(full.cookies, full.groupId, 'a@exemplo.com').expect(
        429,
      );
    });

    expect(events.map((record) => record.event)).toEqual([]);
  });
});
