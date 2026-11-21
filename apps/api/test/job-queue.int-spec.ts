import { randomUUID } from 'node:crypto';
import type { INestApplicationContext } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { inject } from 'vitest';
import { Job } from '../src/jobs/job.entity.js';
import { JobQueue } from '../src/jobs/job-queue.service.js';

class RollbackSignal extends Error {}

describe('JobQueue', () => {
  let app: INestApplicationContext;
  let queue: JobQueue;
  let dataSource: DataSource;

  beforeAll(async () => {
    // O ConfigModule valida o ambiente quando o módulo é importado.
    vi.stubEnv('DATABASE_URL', inject('databaseUrl'));
    const { JobsFixtureModule } =
      await import('./fixtures/jobs-fixture.module.js');
    app = await NestFactory.createApplicationContext(JobsFixtureModule, {
      logger: false,
    });
    queue = app.get(JobQueue);
    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    await app.close();
    vi.unstubAllEnvs();
  });

  const uniqueType = () => `job-queue.${randomUUID()}`;
  const findByType = (type: string) =>
    dataSource.getRepository(Job).findBy({ type });

  it('grava o job PENDING com attempts 0 e runAt do momento da chamada', async () => {
    const type = uniqueType();

    const before = new Date();
    await queue.enqueue(type, { groupId: 'g1', round: 2 });
    const after = new Date();

    const jobs = await findByType(type);
    expect(jobs).toHaveLength(1);
    const [job] = jobs;
    expect(job).toMatchObject({
      type,
      payload: { groupId: 'g1', round: 2 },
      status: 'PENDING',
      attempts: 0,
      lastError: null,
      lockedAt: null,
    });
    expect(job?.runAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(job?.runAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('usa o runAt informado', async () => {
    const type = uniqueType();
    const runAt = new Date('2030-01-15T12:30:00.000Z');

    await queue.enqueue(type, { reminder: true }, { runAt });

    const [job] = await findByType(type);
    expect(job?.runAt.toISOString()).toBe('2030-01-15T12:30:00.000Z');
    expect(job?.status).toBe('PENDING');
    expect(job?.attempts).toBe(0);
  });

  it('não deixa job quando a transação de origem é desfeita', async () => {
    const type = uniqueType();

    await expect(
      dataSource.transaction(async (manager) => {
        await queue.enqueue(type, { draw: 1 }, { manager });
        throw new RollbackSignal();
      }),
    ).rejects.toBeInstanceOf(RollbackSignal);

    expect(await findByType(type)).toHaveLength(0);
  });

  it('deixa o job quando a transação de origem é confirmada', async () => {
    const type = uniqueType();

    await dataSource.transaction(async (manager) => {
      await queue.enqueue(type, { draw: 1 }, { manager });
    });

    const jobs = await findByType(type);
    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({
      type,
      payload: { draw: 1 },
      status: 'PENDING',
      attempts: 0,
    });
  });

  // Com 5 parâmetros por linha, 14.000 jobs num INSERT só passariam do
  // limite de 65.535 parâmetros do Postgres; em lotes de 1.000, cabem.
  it('enqueueMany grava um job por item em lotes de 1000', async () => {
    const type = uniqueType();
    const payloads = Array.from({ length: 14_000 }, (_, index) => ({ index }));

    try {
      const before = new Date();
      await queue.enqueueMany(type, payloads);
      const after = new Date();

      const jobs = await findByType(type);
      expect(jobs).toHaveLength(14_000);
      expect(
        jobs.map((job) => job.payload.index as number).sort((a, b) => a - b),
      ).toEqual(payloads.map((payload) => payload.index));
      for (const job of jobs) {
        expect(job).toMatchObject({
          status: 'PENDING',
          attempts: 0,
          lastError: null,
          lockedAt: null,
        });
        expect(job.runAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
        expect(job.runAt.getTime()).toBeLessThanOrEqual(after.getTime());
      }
    } finally {
      await dataSource.getRepository(Job).delete({ type });
    }
  });

  it('enqueueMany com lista vazia não grava nada', async () => {
    const type = uniqueType();

    await expect(queue.enqueueMany(type, [])).resolves.toBeUndefined();

    expect(await findByType(type)).toHaveLength(0);
  });

  it('enqueueMany desfaz com a transação de origem', async () => {
    const type = uniqueType();

    await expect(
      dataSource.transaction(async (manager) => {
        await queue.enqueueMany(type, [{ to: 1 }, { to: 2 }], { manager });
        expect(await manager.getRepository(Job).countBy({ type })).toBe(2);
        throw new RollbackSignal();
      }),
    ).rejects.toBeInstanceOf(RollbackSignal);

    expect(await findByType(type)).toHaveLength(0);
  });
});
