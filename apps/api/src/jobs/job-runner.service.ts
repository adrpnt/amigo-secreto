import { Injectable } from '@nestjs/common';
import { DataSource, type EntityManager } from 'typeorm';
import { Job } from './job.entity.js';
import { JobHandlerRegistry } from './job-handler.registry.js';
import { BATCH_SIZE } from './job-retry.js';

@Injectable()
export class JobRunner {
  constructor(
    private readonly dataSource: DataSource,
    private readonly handlers: JobHandlerRegistry,
  ) {}

  // O relógio vem de fora para os testes controlarem runAt e lockedAt.
  async runRound(now: Date = new Date()): Promise<void> {
    const jobs = await this.dataSource.transaction((manager) =>
      this.claim(manager, now),
    );
    for (const job of jobs) {
      await this.run(job, now);
    }
  }

  // FOR UPDATE SKIP LOCKED: outra instância pegando jobs ao mesmo tempo pula
  // as linhas travadas aqui em vez de esperar por elas.
  private async claim(manager: EntityManager, now: Date): Promise<Job[]> {
    const jobs = await manager
      .createQueryBuilder(Job, 'job')
      .where('job.status = :pending AND job.runAt <= :now', {
        pending: 'PENDING',
        now,
      })
      .orderBy('job.runAt', 'ASC')
      .limit(BATCH_SIZE)
      .setLock('pessimistic_write')
      .setOnLocked('skip_locked')
      .getMany();
    if (jobs.length === 0) return [];

    await manager
      .createQueryBuilder()
      .update(Job)
      .set({ status: 'RUNNING', lockedAt: now, attempts: () => 'attempts + 1' })
      .whereInIds(jobs.map((job) => job.id))
      .execute();
    return jobs.map((job) => ({
      ...job,
      status: 'RUNNING',
      lockedAt: now,
      attempts: job.attempts + 1,
    }));
  }

  private async run(job: Job, lockedAt: Date): Promise<void> {
    const handler = this.handlers.get(job.type);
    if (!handler) return;
    await handler.handle(job);
    await this.finish(job, lockedAt);
  }

  // Só grava se o job ainda é desta rodada: outra instância pode tê-lo
  // retomado depois de 10 minutos travado.
  private async finish(job: Job, lockedAt: Date): Promise<void> {
    await this.dataSource
      .createQueryBuilder()
      .update(Job)
      .set({ status: 'DONE' })
      .where('id = :id AND status = :running AND "lockedAt" = :lockedAt', {
        id: job.id,
        running: 'RUNNING',
        lockedAt,
      })
      .execute();
  }
}
