import type { INestApplicationContext } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { validateEnvironment } from '../src/config/env.validation.js';
import { DatabaseModule } from '../src/database/database.module.js';
import { renderEmail } from '../src/email/email-layout.js';
import { EmailModule } from '../src/email/email.module.js';
import { EmailService } from '../src/email/email.service.js';
import type { EmailMessage } from '../src/email/email.types.js';
import type { Job, JobStatus } from '../src/jobs/job.entity.js';
import { JobRunner } from '../src/jobs/job-runner.service.js';
import { AppLogger } from '../src/observability/app-logger.js';
import { ObservabilityModule } from '../src/observability/observability.module.js';
import { type FakeResend, startFakeResend } from './fake-resend.js';
import { createIsolatedDatabase } from './isolated-database.js';

const MESSAGE: EmailMessage = {
  to: 'ana@example.com',
  subject: 'Resultado do sorteio do grupo Família',
  blocks: [
    { type: 'paragraph', text: 'O sorteio do grupo Família aconteceu.' },
    { type: 'button', label: 'Ver resultado', url: 'https://exemplo.com/r/1' },
  ],
};

const SENDER = 'Amigo Secreto <nao-responda@amigo.example>';

describe('envio de e-mail', () => {
  const output: string[] = [];
  let databaseUrl: string;
  let resend: FakeResend;
  let app: INestApplicationContext | undefined;

  beforeAll(async () => {
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
      output.push(String(chunk));
      return true;
    });
    databaseUrl = await createIsolatedDatabase('email_send');
    resend = await startFakeResend();
  });

  afterAll(async () => {
    await resend.close();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    output.length = 0;
    resend.reset();
  });

  afterEach(async () => {
    await app?.close();
    app = undefined;
    vi.unstubAllEnvs();
  });

  // O ConfigModule valida o ambiente quando o forRoot é chamado; montar o
  // módulo aqui dá a cada teste o ambiente que ele define. Variável vazia
  // vale como ausente e não deixa um .env local preencher o valor.
  async function start(env: Record<string, string>) {
    vi.stubEnv('DATABASE_URL', databaseUrl);
    vi.stubEnv('RESEND_BASE_URL', resend.url);
    for (const [name, value] of Object.entries(env)) {
      vi.stubEnv(name, value);
    }

    @Module({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
        DatabaseModule,
        ObservabilityModule,
        EmailModule,
      ],
    })
    class EmailSendFixtureModule {}

    app = await NestFactory.createApplicationContext(EmailSendFixtureModule, {
      logger: new AppLogger('production'),
    });
    const dataSource = app.get(DataSource);
    await dataSource.query('DELETE FROM job');
    return {
      emails: app.get(EmailService),
      runner: app.get(JobRunner),
      findJob: async (id: string) => {
        const [row] = await dataSource.query<
          { status: JobStatus; attempts: number; runAt: Date }[]
        >('SELECT status, attempts, "runAt" FROM job WHERE id = $1', [id]);
        return row;
      },
    };
  }

  function logRecords(): Record<string, unknown>[] {
    return output
      .flatMap((chunk) => chunk.split('\n'))
      .filter((line) => line.startsWith('{'))
      .map((line) => JSON.parse(line) as Record<string, unknown>);
  }

  const emailSentEvents = () =>
    logRecords().filter((record) => record.event === 'email.sent');

  // Roda a rodada no instante em que o job vence de novo.
  const runWhenDue = async (
    runner: JobRunner,
    findJob: (id: string) => Promise<{ runAt: Date } | undefined>,
    job: Job,
  ) => {
    const row = await findJob(job.id);
    await runner.runRound(new Date((row?.runAt ?? job.runAt).getTime() + 1));
  };

  it('envia ao Resend destinatário, assunto, HTML, texto e remetente de EMAIL_FROM', async () => {
    const { emails, runner, findJob } = await start({
      NODE_ENV: 'production',
      RESEND_API_KEY: 're_test_key',
      EMAIL_FROM: SENDER,
    });

    const job = await emails.enqueue(MESSAGE);
    await runWhenDue(runner, findJob, job);

    const rendered = renderEmail(MESSAGE);
    expect(resend.requests).toHaveLength(1);
    expect(resend.requests[0]?.url).toBe('/emails');
    expect(resend.requests[0]?.headers.authorization).toBe(
      'Bearer re_test_key',
    );
    expect(resend.requests[0]?.body).toEqual({
      from: SENDER,
      to: ['ana@example.com'],
      subject: 'Resultado do sorteio do grupo Família',
      html: rendered.html,
      text: rendered.text,
    });
    expect((await findJob(job.id))?.status).toBe('DONE');
  });

  it('manda a mesma Idempotency-Key email/<id> em todas as tentativas', async () => {
    const { emails, runner, findJob } = await start({
      NODE_ENV: 'production',
      RESEND_API_KEY: 're_test_key',
      EMAIL_FROM: SENDER,
    });
    resend.replyWith(
      { status: 500, name: 'internal_server_error' },
      { status: 429, name: 'rate_limit_exceeded' },
    );

    const job = await emails.enqueue(MESSAGE);
    await runWhenDue(runner, findJob, job);
    expect(await findJob(job.id)).toMatchObject({
      status: 'PENDING',
      attempts: 1,
    });
    await runWhenDue(runner, findJob, job);
    expect(await findJob(job.id)).toMatchObject({
      status: 'PENDING',
      attempts: 2,
    });
    await runWhenDue(runner, findJob, job);

    expect(await findJob(job.id)).toMatchObject({
      status: 'DONE',
      attempts: 3,
    });
    expect(
      resend.requests.map((request) => request.headers['idempotency-key']),
    ).toEqual([`email/${job.id}`, `email/${job.id}`, `email/${job.id}`]);
  });

  it('emite email.sent com jobId quando o Resend aceita', async () => {
    const { emails, runner, findJob } = await start({
      NODE_ENV: 'production',
      RESEND_API_KEY: 're_test_key',
      EMAIL_FROM: SENDER,
    });
    resend.replyWith({ status: 500, name: 'internal_server_error' });

    const job = await emails.enqueue(MESSAGE);
    await runWhenDue(runner, findJob, job);
    expect(emailSentEvents()).toHaveLength(0);

    await runWhenDue(runner, findJob, job);

    const events = emailSentEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      message: 'email.sent',
      event: 'email.sent',
      jobId: job.id,
    });
  });

  it('sem RESEND_API_KEY fora de produção escreve o e-mail no log, emite email.sent e marca DONE sem chamar o Resend', async () => {
    const { emails, runner, findJob } = await start({
      NODE_ENV: 'development',
      RESEND_API_KEY: '',
      EMAIL_FROM: '',
    });

    const job = await emails.enqueue(MESSAGE);
    await runWhenDue(runner, findJob, job);

    expect(resend.requests).toHaveLength(0);
    const logged = logRecords().filter(
      (record) => record.message === 'E-mail não enviado: RESEND_API_KEY ausente',
    );
    expect(logged).toHaveLength(1);
    expect(logged[0]).toMatchObject({
      to: 'ana@example.com',
      subject: 'Resultado do sorteio do grupo Família',
      text: renderEmail(MESSAGE).text,
    });
    expect(emailSentEvents()).toEqual([
      expect.objectContaining({ event: 'email.sent', jobId: job.id }),
    ]);
    expect((await findJob(job.id))?.status).toBe('DONE');
  });

  it('usa o remetente Amigo Secreto <onboarding@resend.dev> sem EMAIL_FROM fora de produção', async () => {
    const { emails, runner, findJob } = await start({
      NODE_ENV: 'development',
      RESEND_API_KEY: 're_test_key',
      EMAIL_FROM: '',
    });

    const job = await emails.enqueue(MESSAGE);
    await runWhenDue(runner, findJob, job);

    expect(resend.requests).toHaveLength(1);
    expect(resend.requests[0]?.body.from).toBe(
      'Amigo Secreto <onboarding@resend.dev>',
    );
    expect((await findJob(job.id))?.status).toBe('DONE');
  });
});
