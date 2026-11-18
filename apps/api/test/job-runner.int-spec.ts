import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import type { INestApplicationContext } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as Sentry from '@sentry/nestjs';
import { DataSource } from 'typeorm';
import type { Job, JobStatus } from '../src/jobs/job.entity.js';
import { PermanentJobError } from '../src/jobs/job-errors.js';
import { JobHandlerRegistry } from '../src/jobs/job-handler.registry.js';
import { JobQueue } from '../src/jobs/job-queue.service.js';
import { JobRunner } from '../src/jobs/job-runner.service.js';
import { AppLogger } from '../src/observability/app-logger.js';
import { createIsolatedDatabase } from './isolated-database.js';

const NOW = new Date('2030-03-10T12:00:00.000Z');
const minutesBefore = (minutes: number) =>
  new Date(NOW.getTime() - minutes * 60_000);

async function createContext(): Promise<INestApplicationContext> {
  const { JobsFixtureModule } =
    await import('./fixtures/jobs-fixture.module.js');
  return NestFactory.createApplicationContext(JobsFixtureModule, {
    logger: new AppLogger('production'),
  });
}

describe('JobRunner', () => {
  const output: string[] = [];
  const sentEvents: Sentry.ErrorEvent[] = [];
  let app: INestApplicationContext;
  let dataSource: DataSource;
  let queue: JobQueue;
  let handlers: JobHandlerRegistry;
  let runner: JobRunner;

  beforeAll(async () => {
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
      output.push(String(chunk));
      return true;
    });
    Sentry.init({
      dsn: 'https://public@sentry.example.com/1',
      defaultIntegrations: false,
      beforeSend(event) {
        sentEvents.push(event);
        return null;
      },
    });
    // O ConfigModule valida o ambiente quando o módulo é importado.
    vi.stubEnv('DATABASE_URL', await createIsolatedDatabase('job_runner'));
    app = await createContext();
    dataSource = app.get(DataSource);
    queue = app.get(JobQueue);
    handlers = app.get(JobHandlerRegistry);
    runner = app.get(JobRunner);
  });

  afterAll(async () => {
    await app.close();
    await Sentry.close();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  beforeEach(async () => {
    await dataSource.query('DELETE FROM job');
    output.length = 0;
    sentEvents.length = 0;
  });

  function logRecords(): Record<string, unknown>[] {
    return output
      .flatMap((chunk) => chunk.split('\n'))
      .filter((line) => line.startsWith('{'))
      .map((line) => JSON.parse(line) as Record<string, unknown>);
  }

  // Registra um handler que sempre lança o erro informado.
  function failingHandler(error: () => Error) {
    const type = `job-runner.${randomUUID()}`;
    handlers.register(type, {
      handle: () => Promise.reject(error()),
    });
    return type;
  }

  // Registra um handler num tipo novo e devolve o tipo e os ids executados.
  function recordingHandler(onHandle?: (job: Job) => Promise<void>) {
    const type = `job-runner.${randomUUID()}`;
    const handled: string[] = [];
    handlers.register(type, {
      handle: async (job) => {
        handled.push(job.id);
        await onHandle?.(job);
      },
    });
    return { type, handled };
  }

  const findJob = async (id: string) => {
    const [row] = await dataSource.query<
      { status: JobStatus; attempts: number; lockedAt: Date | null }[]
    >('SELECT status, attempts, "lockedAt" FROM job WHERE id = $1', [id]);
    return row;
  };

  const findOutcome = async (id: string) => {
    const [row] = await dataSource.query<
      {
        status: JobStatus;
        attempts: number;
        lastError: string | null;
        runAt: Date;
      }[]
    >('SELECT status, attempts, "lastError", "runAt" FROM job WHERE id = $1', [
      id,
    ]);
    return row;
  };

  const setAttempts = (id: string, attempts: number) =>
    dataSource.query('UPDATE job SET attempts = $2 WHERE id = $1', [
      id,
      attempts,
    ]);

  it('pega no máximo 50 jobs vencidos, do runAt mais antigo ao mais novo', async () => {
    const { type, handled } = recordingHandler();
    // 60 jobs vencidos, gravados fora da ordem de runAt.
    const minutes = Array.from({ length: 60 }, (_, i) => (i * 37) % 60);
    const jobs = [];
    for (const m of minutes) {
      jobs.push(await queue.enqueue(type, {}, { runAt: minutesBefore(m + 1) }));
    }
    const oldestFirst = [...jobs]
      .sort((a, b) => a.runAt.getTime() - b.runAt.getTime())
      .map((job) => job.id);

    await runner.runRound(NOW);

    expect(handled).toEqual(oldestFirst.slice(0, 50));
    const left = await dataSource.query<{ id: string }[]>(
      `SELECT id FROM job WHERE status = 'PENDING' ORDER BY "runAt"`,
    );
    expect(left.map((row) => row.id)).toEqual(oldestFirst.slice(50));
  });

  it('marca o job pego como RUNNING com lockedAt e soma 1 a attempts', async () => {
    let seen: Awaited<ReturnType<typeof findJob>> | undefined;
    const { type } = recordingHandler(async (job) => {
      seen = await findJob(job.id);
    });
    const job = await queue.enqueue(type, {}, { runAt: minutesBefore(1) });
    // Job que já falhou duas vezes e voltou a PENDING.
    await dataSource.query('UPDATE job SET attempts = 2 WHERE id = $1', [
      job.id,
    ]);

    await runner.runRound(NOW);

    expect(seen).toEqual({ status: 'RUNNING', attempts: 3, lockedAt: NOW });
  });

  it('entrega cada job a uma só de duas rodadas simultâneas', async () => {
    const other = await createContext();
    try {
      const executions: string[] = [];
      const type = `job-runner.${randomUUID()}`;
      for (const registry of [handlers, other.get(JobHandlerRegistry)]) {
        registry.register(type, {
          handle: (job) => {
            executions.push(job.id);
            return Promise.resolve();
          },
        });
      }
      const ids = [];
      for (let i = 0; i < 60; i++) {
        ids.push(
          (await queue.enqueue(type, {}, { runAt: minutesBefore(i + 1) })).id,
        );
      }

      // Segura a tabela até as duas rodadas estarem esperando por ela, para
      // as duas pegarem jobs ao mesmo tempo.
      const blocker = dataSource.createQueryRunner();
      await blocker.connect();
      await blocker.startTransaction();
      await blocker.query('LOCK TABLE job IN EXCLUSIVE MODE');
      const rounds = Promise.all([
        runner.runRound(NOW),
        other.get(JobRunner).runRound(NOW),
      ]);
      await vi.waitFor(
        async () => {
          const [row] = await dataSource.query<{ waiting: number }[]>(
            `SELECT count(*)::int AS waiting FROM pg_locks
             WHERE relation = 'job'::regclass AND NOT granted
               AND database = (SELECT oid FROM pg_database
                               WHERE datname = current_database())`,
          );
          expect(row?.waiting).toBe(2);
        },
        { timeout: 10_000, interval: 20 },
      );
      await blocker.commitTransaction();
      await blocker.release();
      await rounds;

      expect(executions).toHaveLength(60);
      expect(new Set(executions)).toEqual(new Set(ids));
    } finally {
      await other.close();
    }
  });

  it('marca DONE o job cujo handler termina sem erro', async () => {
    const { type } = recordingHandler();
    const job = await queue.enqueue(type, {}, { runAt: minutesBefore(1) });

    await runner.runRound(NOW);

    expect(await findJob(job.id)).toEqual({
      status: 'DONE',
      attempts: 1,
      lockedAt: NOW,
    });
  });

  it('executa os jobs da rodada um de cada vez, na ordem em que foram pegos', async () => {
    const events: string[] = [];
    const { type } = recordingHandler(async (job) => {
      events.push(`início ${job.id}`);
      await delay(30);
      events.push(`fim ${job.id}`);
    });
    const third = await queue.enqueue(type, {}, { runAt: minutesBefore(1) });
    const first = await queue.enqueue(type, {}, { runAt: minutesBefore(3) });
    const second = await queue.enqueue(type, {}, { runAt: minutesBefore(2) });

    await runner.runRound(NOW);

    expect(events).toEqual([
      `início ${first.id}`,
      `fim ${first.id}`,
      `início ${second.id}`,
      `fim ${second.id}`,
      `início ${third.id}`,
      `fim ${third.id}`,
    ]);
  });

  it('não pega jobs com runAt no futuro, DONE ou FAILED', async () => {
    const { type, handled } = recordingHandler();
    const due = await queue.enqueue(type, {}, { runAt: NOW });
    const future = await queue.enqueue(
      type,
      {},
      {
        runAt: new Date(NOW.getTime() + 1),
      },
    );
    const done = await queue.enqueue(type, {}, { runAt: minutesBefore(5) });
    const failed = await queue.enqueue(type, {}, { runAt: minutesBefore(5) });
    await dataSource.query(`UPDATE job SET status = 'DONE' WHERE id = $1`, [
      done.id,
    ]);
    await dataSource.query(`UPDATE job SET status = 'FAILED' WHERE id = $1`, [
      failed.id,
    ]);

    await runner.runRound(NOW);

    expect(handled).toEqual([due.id]);
    expect(await findJob(future.id)).toMatchObject({
      status: 'PENDING',
      attempts: 0,
    });
    expect(await findJob(done.id)).toMatchObject({
      status: 'DONE',
      attempts: 0,
    });
    expect(await findJob(failed.id)).toMatchObject({
      status: 'FAILED',
      attempts: 0,
    });
  });

  it('devolve a PENDING com as esperas de 1, 5, 25 e 125 minutos', async () => {
    const type = failingHandler(() => new Error('Resend 500 internal_error'));
    const job = await queue.enqueue(type, {}, { runAt: NOW });

    let roundAt = NOW;
    const waits: number[] = [];
    for (const attempts of [1, 2, 3, 4]) {
      await runner.runRound(roundAt);

      const outcome = await findOutcome(job.id);
      expect(outcome).toMatchObject({
        status: 'PENDING',
        attempts,
        lastError: 'Error: Resend 500 internal_error',
      });
      const waitMs = outcome.runAt.getTime() - roundAt.getTime();
      const minutes = Math.floor(waitMs / 60_000);
      // O instante da falha é o da rodada mais o tempo que ela levou.
      expect(waitMs - minutes * 60_000).toBeLessThan(5_000);
      waits.push(minutes);
      roundAt = outcome.runAt;
    }

    expect(waits).toEqual([1, 5, 25, 125]);
  });

  it('marca FAILED quando a quinta tentativa falha', async () => {
    const type = failingHandler(() => new Error('Resend 503 unavailable'));
    const job = await queue.enqueue(type, {}, { runAt: NOW });
    await setAttempts(job.id, 4);

    await runner.runRound(NOW);

    expect(await findOutcome(job.id)).toMatchObject({
      status: 'FAILED',
      attempts: 5,
      lastError: 'Error: Resend 503 unavailable',
    });
  });

  it('marca FAILED na hora um erro definitivo', async () => {
    const type = failingHandler(
      () => new PermanentJobError('Resend 422 validation_error'),
    );
    const job = await queue.enqueue(type, {}, { runAt: NOW });

    await runner.runRound(NOW);

    expect(await findOutcome(job.id)).toMatchObject({
      status: 'FAILED',
      attempts: 1,
      lastError: 'PermanentJobError: Resend 422 validation_error',
    });
  });

  it('marca FAILED o job de tipo sem handler com Tipo de job desconhecido', async () => {
    const type = `job-runner.sem-handler.${randomUUID()}`;
    const job = await queue.enqueue(type, {}, { runAt: NOW });

    await runner.runRound(NOW);

    expect(await findOutcome(job.id)).toMatchObject({
      status: 'FAILED',
      attempts: 1,
      lastError: `Tipo de job desconhecido: ${type}`,
    });
  });

  it('emite job.failed com jobId, type e attempts quando o job vira FAILED', async () => {
    const type = failingHandler(() => new Error('Resend 500 internal_error'));
    const job = await queue.enqueue(type, {}, { runAt: NOW });
    await setAttempts(job.id, 4);

    await runner.runRound(NOW);

    expect(
      logRecords().filter((record) => record.event === 'job.failed'),
    ).toEqual([expect.objectContaining({ jobId: job.id, type, attempts: 5 })]);
  });

  it('envia ao Sentry o job que vira FAILED com jobId e type', async () => {
    const type = failingHandler(
      () => new PermanentJobError('Resend 401 missing_api_key'),
    );
    const job = await queue.enqueue(type, {}, { runAt: NOW });

    await runner.runRound(NOW);
    await Sentry.flush(2000);

    expect(sentEvents).toHaveLength(1);
    expect(sentEvents[0]?.tags).toEqual({ jobId: job.id, type });
    expect(sentEvents[0]?.exception?.values?.[0]?.value).toBe(
      `Job ${type} falhou`,
    );
  });

  it('escreve um aviso sem Sentry quando o job volta a PENDING', async () => {
    const type = failingHandler(() => new Error('Tempo esgotado'));
    const job = await queue.enqueue(type, {}, { runAt: NOW });

    await runner.runRound(NOW);
    await Sentry.flush(2000);

    const { runAt } = await findOutcome(job.id);
    expect(logRecords().filter((record) => record.level === 'warn')).toEqual([
      expect.objectContaining({
        context: 'Jobs',
        jobId: job.id,
        type,
        attempts: 1,
        runAt: runAt.toISOString(),
      }),
    ]);
    expect(sentEvents).toHaveLength(0);
  });

  const markRunning = (id: string, lockedAt: Date, attempts: number) =>
    dataSource.query(
      `UPDATE job SET status = 'RUNNING', "lockedAt" = $2, attempts = $3
       WHERE id = $1`,
      [id, lockedAt, attempts],
    );

  it('retoma o job RUNNING travado há mais de 10 minutos com menos de 5 tentativas', async () => {
    const { type, handled } = recordingHandler();
    const stuck = await queue.enqueue(type, {}, { runAt: minutesBefore(30) });
    const running = await queue.enqueue(type, {}, { runAt: minutesBefore(30) });
    await markRunning(stuck.id, new Date(minutesBefore(10).getTime() - 1), 4);
    // Exatamente 10 minutos ainda não é travado.
    await markRunning(running.id, minutesBefore(10), 2);

    await runner.runRound(NOW);

    expect(handled).toEqual([stuck.id]);
    expect(await findJob(stuck.id)).toEqual({
      status: 'DONE',
      attempts: 5,
      lockedAt: NOW,
    });
    expect(await findJob(running.id)).toEqual({
      status: 'RUNNING',
      attempts: 2,
      lockedAt: minutesBefore(10),
    });
  });

  it('marca FAILED com Processamento interrompido o job travado com 5 tentativas', async () => {
    const { type, handled } = recordingHandler();
    const job = await queue.enqueue(type, {}, { runAt: minutesBefore(30) });
    await markRunning(job.id, minutesBefore(11), 5);

    await runner.runRound(NOW);
    await Sentry.flush(2000);

    expect(handled).toEqual([]);
    expect(await findOutcome(job.id)).toMatchObject({
      status: 'FAILED',
      attempts: 5,
      lastError: 'Processamento interrompido',
    });
    expect(
      logRecords().filter((record) => record.event === 'job.failed'),
    ).toEqual([expect.objectContaining({ jobId: job.id, type, attempts: 5 })]);
    expect(sentEvents.map((event) => event.tags)).toEqual([
      { jobId: job.id, type },
    ]);
  });
});
