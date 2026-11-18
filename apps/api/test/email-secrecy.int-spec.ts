import { randomUUID } from 'node:crypto';
import type { INestApplicationContext } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as Sentry from '@sentry/nestjs';
import { DataSource } from 'typeorm';
import { EmailService } from '../src/email/email.service.js';
import type { EmailMessage } from '../src/email/email.types.js';
import type { JobStatus } from '../src/jobs/job.entity.js';
import { JobRunner } from '../src/jobs/job-runner.service.js';
import { AppLogger } from '../src/observability/app-logger.js';
import { type FakeResend, startFakeResend } from './fake-resend.js';
import { createIsolatedDatabase } from './isolated-database.js';

// Marcas únicas em cada parte do e-mail: se alguma aparecer num registro,
// o registro vazou o e-mail.
const MARK = randomUUID().slice(0, 8);
const RECIPIENT = `destinatario.${MARK}@example.com`;
const SUBJECT = `Assunto ${MARK}-assunto`;
const SECRET_NAME = `Bia ${MARK}-sorteada`;
const BUTTON_LABEL = `Ver ${MARK}-rotulo`;
const BUTTON_URL = `https://exemplo.com/r/${MARK}-url`;
const MARKS = [
  RECIPIENT,
  `${MARK}-assunto`,
  `${MARK}-sorteada`,
  `${MARK}-rotulo`,
  `${MARK}-url`,
];

const MESSAGE: EmailMessage = {
  to: RECIPIENT,
  subject: SUBJECT,
  blocks: [
    { type: 'paragraph', text: `Você tirou ${SECRET_NAME}.` },
    { type: 'button', label: BUTTON_LABEL, url: BUTTON_URL },
  ],
};

// Um Resend que repete o destinatário e o assunto na mensagem de erro.
const LEAKY_MESSAGE = `Invalid \`to\` field: ${RECIPIENT} (${SUBJECT})`;

describe('sigilo do e-mail', () => {
  const output: string[] = [];
  const sentEvents: Sentry.ErrorEvent[] = [];
  let resend: FakeResend;
  let app: INestApplicationContext;
  let dataSource: DataSource;
  let emails: EmailService;
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
    vi.stubEnv('DATABASE_URL', await createIsolatedDatabase('email_secrecy'));
    vi.stubEnv('RESEND_API_KEY', 're_test_key');
    vi.stubEnv('EMAIL_FROM', 'Amigo Secreto <nao-responda@amigo.example>');
    vi.stubEnv('RESEND_BASE_URL', resend.url);
    const { EmailFixtureModule } =
      await import('./fixtures/email-fixture.module.js');
    app = await NestFactory.createApplicationContext(EmailFixtureModule, {
      logger: new AppLogger('production'),
    });
    dataSource = app.get(DataSource);
    emails = app.get(EmailService);
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

  const findJob = async (id: string) => {
    const [row] = await dataSource.query<
      { status: JobStatus; lastError: string | null; runAt: Date }[]
    >('SELECT status, "lastError", "runAt" FROM job WHERE id = $1', [id]);
    if (!row) throw new Error(`Job ${id} não encontrado`);
    return row;
  };

  // Roda a rodada no instante em que o job vence de novo.
  const runWhenDue = async (id: string) => {
    const { runAt } = await findJob(id);
    await runner.runRound(new Date(runAt.getTime() + 1));
  };

  const leakedMarks = (records: string) =>
    MARKS.filter((mark) => records.includes(mark));

  it('não escreve destinatário, assunto nem conteúdo em logs, eventos ou Sentry em production', async () => {
    resend.replyWith(
      // Envio aceito na segunda tentativa.
      { status: 500, name: 'internal_server_error', message: LEAKY_MESSAGE },
      { status: 200 },
      // Falha de vez.
      { status: 422, name: 'validation_error', message: LEAKY_MESSAGE },
    );

    const sent = await emails.enqueue(MESSAGE);
    await runWhenDue(sent.id);
    await runWhenDue(sent.id);
    const failed = await emails.enqueue(MESSAGE);
    await runWhenDue(failed.id);
    await Sentry.flush(2000);

    expect((await findJob(sent.id)).status).toBe('DONE');
    expect((await findJob(failed.id)).status).toBe('FAILED');
    // As marcas chegaram ao Resend: o e-mail foi de fato montado com elas.
    expect(leakedMarks(JSON.stringify(resend.requests))).toEqual(MARKS);
    // Os registros existem: aviso da nova tentativa, email.sent, job.failed e
    // o erro no Sentry.
    const logs = output.join('');
    expect(logs).toContain('Job vai ser tentado de novo');
    expect(logs).toContain('"event":"email.sent"');
    expect(logs).toContain('"event":"job.failed"');
    expect(sentEvents).toHaveLength(1);
    expect(leakedMarks(logs)).toEqual([]);
    expect(leakedMarks(JSON.stringify(sentEvents))).toEqual([]);
  });

  it('não grava destinatário, assunto nem conteúdo no lastError', async () => {
    resend.replyWith(
      { status: 500, name: 'internal_server_error', message: LEAKY_MESSAGE },
      { status: 422, name: 'validation_error', message: LEAKY_MESSAGE },
    );

    const job = await emails.enqueue(MESSAGE);
    await runWhenDue(job.id);
    const retried = await findJob(job.id);
    await runWhenDue(job.id);
    const failed = await findJob(job.id);

    expect(retried).toMatchObject({
      status: 'PENDING',
      lastError: 'Error: Resend 500 internal_server_error',
    });
    expect(failed).toMatchObject({
      status: 'FAILED',
      lastError: 'PermanentJobError: Resend 422 validation_error',
    });
    expect(leakedMarks(`${retried.lastError} ${failed.lastError}`)).toEqual(
      [],
    );
  });
});
