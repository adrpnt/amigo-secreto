import { randomUUID } from 'node:crypto';
import type { INestApplicationContext } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as Sentry from '@sentry/nestjs';
import { DataSource } from 'typeorm';
import { DrawsService } from '../src/draws/draws.service.js';
import type { JobStatus } from '../src/jobs/job.entity.js';
import { JobRunner } from '../src/jobs/job-runner.service.js';
import { AppLogger } from '../src/observability/app-logger.js';
import { stubAccountEnv } from './account-env.js';
import { type FakeResend, startFakeResend } from './fake-resend.js';
import { insertGroup, insertMembership, insertUser } from './group-helpers.js';
import { createIsolatedDatabase } from './isolated-database.js';

const WEB_URL = 'http://localhost:3000';
const PREVIEW = 'Abra num lugar reservado para ver quem você tirou.';

type Person = { id: string; email: string; name: string };

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

type Scenario = { groupId: string; owner: Person; people: Person[] };

type SentEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
  key: string | undefined;
};

describe('e-mail do resultado', () => {
  const output: string[] = [];
  const sentEvents: Sentry.ErrorEvent[] = [];
  let resend: FakeResend;
  let app: INestApplicationContext;
  let dataSource: DataSource;
  let draws: DrawsService;
  let runner: JobRunner;

  beforeAll(async () => {
    const capture = (chunk: unknown) => {
      output.push(String(chunk));
      return true;
    };
    vi.spyOn(process.stdout, 'write').mockImplementation(capture);
    vi.spyOn(process.stderr, 'write').mockImplementation(capture);
    Sentry.init({
      dsn: 'https://public@sentry.example.com/1',
      beforeSend(event) {
        sentEvents.push(event);
        return null;
      },
    });
    resend = await startFakeResend();
    // O ConfigModule valida o ambiente quando o módulo é importado.
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv(
      'DATABASE_URL',
      await createIsolatedDatabase('draw_result_email'),
    );
    vi.stubEnv('RESEND_API_KEY', 're_test_key');
    vi.stubEnv('EMAIL_FROM', 'Amigo Secreto <nao-responda@amigo.example>');
    vi.stubEnv('RESEND_BASE_URL', resend.url);
    stubAccountEnv();
    const { DrawsJobsFixtureModule } =
      await import('./fixtures/draws-jobs-fixture.module.js');
    app = await NestFactory.createApplicationContext(DrawsJobsFixtureModule, {
      logger: new AppLogger('production'),
    });
    dataSource = app.get(DataSource);
    draws = app.get(DrawsService);
    runner = app.get(JobRunner);
  });

  afterAll(async () => {
    await app.close();
    await resend.close();
    await Sentry.close();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  beforeEach(async () => {
    await dataSource.query('DELETE FROM job');
    output.length = 0;
    sentEvents.length = 0;
    resend.reset();
  });

  async function person(name: string): Promise<Person> {
    return { ...(await insertUser(dataSource, name)), name };
  }

  // Grupo ABERTO organizado por `ownerName`, com os outros aprovados.
  async function groupWith(
    groupName: string,
    ownerName: string,
    ...names: string[]
  ): Promise<Scenario> {
    const owner = await person(ownerName);
    const groupId = await insertGroup(dataSource, {
      ownerId: owner.id,
      name: groupName,
    });
    const people = [owner];
    for (const name of names) {
      const member = await person(name);
      await insertMembership(dataSource, groupId, member.id, 'APPROVED');
      people.push(member);
    }
    return { groupId, owner, people };
  }

  async function receiverOf(
    groupId: string,
    giverUserId: string,
  ): Promise<string> {
    const [row] = await dataSource.query<{ receiverUserId: string }[]>(
      `SELECT a."receiverUserId" FROM assignment a
       JOIN draw d ON d.id = a."drawId"
       WHERE d."groupId" = $1 AND a."giverUserId" = $2`,
      [groupId, giverUserId],
    );
    return row.receiverUserId;
  }

  type JobRow = { id: string; status: JobStatus; runAt: Date };

  async function resultJobs(): Promise<JobRow[]> {
    return dataSource.query<JobRow[]>(
      `SELECT id, status, "runAt" FROM job
       WHERE type = 'draw.result_email' ORDER BY id`,
    );
  }

  function sentEmails(): SentEmail[] {
    return resend.requests.map((request) => ({
      to: (request.body.to as string[])[0],
      subject: request.body.subject as string,
      html: request.body.html as string,
      text: request.body.text as string,
      key: request.headers['idempotency-key'] as string | undefined,
    }));
  }

  async function runJobs(): Promise<void> {
    await runner.runRound(new Date(Date.now() + 1000));
  }

  it('envia a cada participante o assunto sem o nome e o nome só no corpo', async () => {
    const { groupId, owner, people } = await groupWith(
      'Família',
      'Ana Souza',
      'Bruno Lima',
      'Carla Dias',
    );
    await draws.perform(owner.id, groupId);

    await runJobs();

    const emails = sentEmails();
    expect(emails.map((email) => email.to).sort()).toEqual(
      people.map((p) => p.email).sort(),
    );
    for (const giver of people) {
      const email = emails.find((sent) => sent.to === giver.email)!;
      const receiverId = await receiverOf(groupId, giver.id);
      const receiver = people.find((p) => p.id === receiverId)!;
      expect(email.subject).toBe('O sorteio de Família foi feito');
      expect(email.text).toBe(
        [
          'Amigo Secreto',
          'Ana Souza fez o sorteio do amigo secreto Família.',
          `Você tirou: ${receiver.name}`,
          'Só você recebeu este nome. Guarde segredo!',
          `Ver no site: ${WEB_URL}/grupos/${groupId}/sorteio`,
          'Este e-mail foi enviado pelo Amigo Secreto. Não responda esta mensagem.',
        ].join('\n\n'),
      );
      expect(email.html).toContain(`Você tirou: ${receiver.name}`);
    }
    expect((await resultJobs()).map((job) => job.status)).toEqual([
      'DONE',
      'DONE',
      'DONE',
    ]);
  });

  it('a pré-visualização do e-mail não contém o nome sorteado', async () => {
    const { groupId, owner, people } = await groupWith(
      'Família',
      'Ana Souza',
      'Bruno Lima',
      'Carla Dias',
    );
    await draws.perform(owner.id, groupId);

    await runJobs();

    const emails = sentEmails();
    expect(emails).toHaveLength(3);
    for (const email of emails) {
      // O bloco oculto vem antes de todo texto visível e termina em espaços
      // invisíveis, para o cliente não completar a prévia com o corpo.
      const body = email.html.slice(email.html.indexOf('<body'));
      const hidden =
        /^<body[^>]*>\s*<div style="display:none[^"]*">([^<]*)<\/div>/.exec(
          body,
        );
      expect(hidden).not.toBeNull();
      const preview = hidden![1];
      expect(preview.startsWith(PREVIEW)).toBe(true);
      expect(preview.slice(PREVIEW.length)).toMatch(/^(&#847;&zwnj;&nbsp;)+$/);
      for (const p of people) expect(preview).not.toContain(p.name);
    }
  });

  it('não envia depois que o sorteio é cancelado', async () => {
    const { groupId, owner } = await groupWith(
      'Família',
      'Ana Souza',
      'Bruno Lima',
      'Carla Dias',
    );
    await draws.perform(owner.id, groupId);
    await dataSource.query(
      `DELETE FROM assignment WHERE "drawId" IN
         (SELECT id FROM draw WHERE "groupId" = $1)`,
      [groupId],
    );
    await dataSource.query(
      `UPDATE draw SET status = 'CANCELLED', "cancelledAt" = now()
       WHERE "groupId" = $1`,
      [groupId],
    );
    await dataSource.query(`UPDATE "group" SET status = 'OPEN' WHERE id = $1`, [
      groupId,
    ]);

    await runJobs();

    expect(resend.requests).toEqual([]);
    expect((await resultJobs()).map((job) => job.status)).toEqual([
      'DONE',
      'DONE',
      'DONE',
    ]);
  });

  it('não envia depois que o grupo é excluído', async () => {
    const { groupId, owner } = await groupWith(
      'Família',
      'Ana Souza',
      'Bruno Lima',
      'Carla Dias',
    );
    await draws.perform(owner.id, groupId);
    await dataSource.query('DELETE FROM "group" WHERE id = $1', [groupId]);

    await runJobs();

    expect(resend.requests).toEqual([]);
    expect((await resultJobs()).map((job) => job.status)).toEqual([
      'DONE',
      'DONE',
      'DONE',
    ]);
  });

  it('mostra nomes com marcação HTML como texto', async () => {
    const { groupId, owner, people } = await groupWith(
      '<b>Família</b>',
      '<i>Ana</i>',
      '<u>Bruno</u>',
      '<s>Carla</s>',
    );
    await draws.perform(owner.id, groupId);

    await runJobs();

    const emails = sentEmails();
    expect(emails).toHaveLength(3);
    for (const giver of people) {
      const email = emails.find((sent) => sent.to === giver.email)!;
      const receiverId = await receiverOf(groupId, giver.id);
      const receiver = people.find((p) => p.id === receiverId)!;
      expect(email.html).toContain(`Você tirou: ${escapeHtml(receiver.name)}`);
      expect(email.html).toContain(
        '&lt;i&gt;Ana&lt;/i&gt; fez o sorteio do amigo secreto &lt;b&gt;Família&lt;/b&gt;.',
      );
      for (const p of people) expect(email.html).not.toContain(p.name);
      expect(email.html).not.toContain('<b>Família</b>');
    }
  });

  it('falha do transporte não leva nome nem e-mail ao log nem ao Sentry', async () => {
    const mark = randomUUID().slice(0, 8);
    const { groupId, owner, people } = await groupWith(
      `Grupo ${mark}-grupo`,
      `Ana ${mark}-ana`,
      `Bruno ${mark}-bruno`,
      `Carla ${mark}-carla`,
    );
    const marks = [
      `${mark}-grupo`,
      ...people.flatMap((p) => [p.email, p.name.split(' ')[1]]),
    ];
    // Um Resend que repete o destinatário e o corpo na mensagem de erro.
    const leaky = `Invalid \`to\` field: ${people.map((p) => `${p.email} ${p.name}`).join(', ')}`;
    resend.replyWith(
      { status: 500, name: 'internal_server_error', message: leaky },
      { status: 422, name: 'validation_error', message: leaky },
      { status: 422, name: 'validation_error', message: leaky },
      { status: 422, name: 'validation_error', message: leaky },
    );
    await draws.perform(owner.id, groupId);

    await runJobs();
    const retried = (await resultJobs()).find(
      (job) => job.status === 'PENDING',
    )!;
    await runner.runRound(new Date(retried.runAt.getTime() + 1));
    await Sentry.flush(2000);

    const jobs = await resultJobs();
    expect(jobs.filter((job) => job.status === 'FAILED')).toHaveLength(3);
    // As marcas chegaram ao Resend: o e-mail foi de fato montado com elas.
    const requests = JSON.stringify(resend.requests);
    expect(marks.filter((m) => !requests.includes(m))).toEqual([]);
    const logs = output.join('');
    expect(logs).toContain('Job vai ser tentado de novo');
    expect(logs).toContain('"event":"job.failed"');
    // O Sentry descarta erros iguais em sequência; basta um para conferir.
    expect(sentEvents.length).toBeGreaterThan(0);
    const records = `${logs} ${JSON.stringify(sentEvents)}`;
    expect(marks.filter((m) => records.includes(m))).toEqual([]);
    const lastErrors = await dataSource.query<{ lastError: string }[]>(
      `SELECT "lastError" FROM job WHERE type = 'draw.result_email'`,
    );
    const stored = JSON.stringify(lastErrors);
    expect(marks.filter((m) => stored.includes(m))).toEqual([]);
  });

  it('repete com a mesma chave depois de falha passageira', async () => {
    const { groupId, owner } = await groupWith(
      'Família',
      'Ana Souza',
      'Bruno Lima',
      'Carla Dias',
    );
    resend.replyWith({ status: 500, name: 'internal_server_error' });
    await draws.perform(owner.id, groupId);

    await runJobs();
    const retried = (await resultJobs()).find(
      (job) => job.status === 'PENDING',
    )!;
    const failedTo = sentEmails()[0].to;
    await runner.runRound(new Date(retried.runAt.getTime() + 1));

    expect((await resultJobs()).map((job) => job.status)).toEqual([
      'DONE',
      'DONE',
      'DONE',
    ]);
    const attempts = sentEmails().filter((email) => email.to === failedTo);
    expect(attempts.map((email) => email.key)).toEqual([
      `email/${retried.id}`,
      `email/${retried.id}`,
    ]);
    expect(attempts[1].text).toBe(attempts[0].text);
  });
});
