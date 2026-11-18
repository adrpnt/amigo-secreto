import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import type { INestApplicationContext } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import type { Job, JobStatus } from '../src/jobs/job.entity.js';
import { JobHandlerRegistry } from '../src/jobs/job-handler.registry.js';
import { JobQueue } from '../src/jobs/job-queue.service.js';
import { JobRunner } from '../src/jobs/job-runner.service.js';
import { createIsolatedDatabase } from './isolated-database.js';

const NOW = new Date('2030-03-10T12:00:00.000Z');
const minutesBefore = (minutes: number) =>
  new Date(NOW.getTime() - minutes * 60_000);

async function createContext(): Promise<INestApplicationContext> {
  const { JobsFixtureModule } =
    await import('./fixtures/jobs-fixture.module.js');
  return NestFactory.createApplicationContext(JobsFixtureModule, {
    logger: false,
  });
}

describe('JobRunner', () => {
  let app: INestApplicationContext;
  let dataSource: DataSource;
  let queue: JobQueue;
  let handlers: JobHandlerRegistry;
  let runner: JobRunner;

  beforeAll(async () => {
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
    vi.unstubAllEnvs();
  });

  beforeEach(async () => {
    await dataSource.query('DELETE FROM job');
  });

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
});
