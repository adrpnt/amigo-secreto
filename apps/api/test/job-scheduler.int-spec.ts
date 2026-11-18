import type { INestApplicationContext } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { createIsolatedDatabase } from './isolated-database.js';

const START = new Date('2030-03-10T12:00:00.000Z');

// Sobe o agendador com o NODE_ENV informado. O ScheduleModule lê o NODE_ENV
// quando o módulo é avaliado, então os módulos da API são recarregados.
async function startScheduler(nodeEnv: string) {
  vi.stubEnv('NODE_ENV', nodeEnv);
  vi.resetModules();
  const { JobsFixtureModule } =
    await import('./fixtures/jobs-fixture.module.js');
  const { JobsSchedulerModule } =
    await import('../src/jobs/jobs-scheduler.module.js');
  const { JobRunner } = await import('../src/jobs/job-runner.service.js');

  const app = await NestFactory.createApplicationContext(
    {
      module: class SchedulerTestModule {},
      imports: [JobsFixtureModule, JobsSchedulerModule],
    },
    { logger: false },
  );
  const rounds: number[] = [];
  const runRound = vi
    .spyOn(app.get(JobRunner), 'runRound')
    .mockImplementation(() => {
      rounds.push(Date.now() - START.getTime());
      return Promise.resolve();
    });
  return { app, rounds, runRound };
}

describe('JobScheduler', () => {
  let app: INestApplicationContext | undefined;

  beforeAll(async () => {
    vi.stubEnv('DATABASE_URL', await createIsolatedDatabase('job_scheduler'));
  });

  beforeEach(() => {
    vi.useFakeTimers({
      now: START,
      toFake: ['setTimeout', 'clearTimeout', 'Date'],
    });
  });

  afterEach(async () => {
    await app?.close();
    app = undefined;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  afterAll(() => {
    vi.unstubAllEnvs();
  });

  it('dispara a rodada a cada 10 segundos', async () => {
    const scheduler = await startScheduler('development');
    app = scheduler.app;

    await vi.advanceTimersByTimeAsync(30_000);

    expect(scheduler.rounds).toEqual([10_000, 20_000, 30_000]);
  });

  it('pula o tick enquanto a rodada anterior ainda roda', async () => {
    const scheduler = await startScheduler('development');
    app = scheduler.app;
    let finishRound = () => {};
    scheduler.runRound.mockImplementationOnce(() => {
      scheduler.rounds.push(Date.now() - START.getTime());
      return new Promise<void>((resolve) => {
        finishRound = resolve;
      });
    });

    // A primeira rodada começa em 10 s e só termina em 35 s.
    await vi.advanceTimersByTimeAsync(35_000);
    finishRound();
    await vi.advanceTimersByTimeAsync(5_000);

    expect(scheduler.rounds).toEqual([10_000, 40_000]);
  });

  it('não liga o cron com NODE_ENV test', async () => {
    const scheduler = await startScheduler('test');
    app = scheduler.app;

    await vi.advanceTimersByTimeAsync(30_000);

    expect(scheduler.rounds).toEqual([]);
  });
});
