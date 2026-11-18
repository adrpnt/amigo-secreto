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
});
