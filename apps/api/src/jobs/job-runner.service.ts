import { Injectable, Logger } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import { DataSource, type EntityManager } from 'typeorm';
import { BusinessEventsService } from '../observability/business-events.service.js';
import { Job } from './job.entity.js';
import { PermanentJobError } from './job-errors.js';
import { JobHandlerRegistry } from './job-handler.registry.js';
import {
  BATCH_SIZE,
  MAX_ATTEMPTS,
  nextRunAt,
  STUCK_AFTER_MS,
  toLastError,
} from './job-retry.js';

const stuckBefore = (now: Date) => new Date(now.getTime() - STUCK_AFTER_MS);

@Injectable()
export class JobRunner {
  private readonly logger = new Logger('Jobs');

  constructor(
    private readonly dataSource: DataSource,
    private readonly handlers: JobHandlerRegistry,
    private readonly businessEvents: BusinessEventsService,
  ) {}

  // O relógio vem de fora para os testes controlarem runAt e lockedAt.
  async runRound(now: Date = new Date()): Promise<void> {
    const startedAt = Date.now();
    // Instante atual no relógio da rodada: now mais o tempo que ela já levou.
    const clock = () => new Date(now.getTime() + Date.now() - startedAt);
    try {
      await this.failInterrupted(now);
      const jobs = await this.dataSource.transaction((manager) =>
        this.claim(manager, now),
      );
      for (const job of jobs) {
        await this.run(job, now, clock);
      }
    } catch (error) {
      // Sem Sentry: com o banco fora, a rodada falharia a cada 10 segundos.
      this.logger.error('Rodada de jobs interrompida', {
        error: toLastError(error),
      });
    }
  }

  // Job travado em RUNNING sem tentativa sobrando: a instância caiu no meio
  // da última tentativa.
  private async failInterrupted(now: Date): Promise<void> {
    const result = await this.dataSource
      .createQueryBuilder()
      .update(Job)
      .set({ status: 'FAILED', lastError: 'Processamento interrompido' })
      .where(
        'status = :running AND "lockedAt" < :stuckBefore AND attempts >= :max',
        {
          running: 'RUNNING',
          stuckBefore: stuckBefore(now),
          max: MAX_ATTEMPTS,
        },
      )
      .returning(['id', 'type', 'attempts'])
      .execute();
    for (const job of result.raw as Pick<Job, 'id' | 'type' | 'attempts'>[]) {
      this.reportFailed(job);
    }
  }

  // FOR UPDATE SKIP LOCKED: outra instância pegando jobs ao mesmo tempo pula
  // as linhas travadas aqui em vez de esperar por elas. Um job RUNNING
  // travado há mais de 10 minutos é pego de novo como um PENDING vencido.
  private async claim(manager: EntityManager, now: Date): Promise<Job[]> {
    const jobs = await manager
      .createQueryBuilder(Job, 'job')
      .where(
        `(job.status = :pending AND job.runAt <= :now)
         OR (job.status = :running AND job.lockedAt < :stuckBefore
             AND job.attempts < :max)`,
        {
          pending: 'PENDING',
          running: 'RUNNING',
          now,
          stuckBefore: stuckBefore(now),
          max: MAX_ATTEMPTS,
        },
      )
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

  private async run(
    job: Job,
    lockedAt: Date,
    clock: () => Date,
  ): Promise<void> {
    const handler = this.handlers.get(job.type);
    if (!handler) {
      await this.fail(job, lockedAt, `Tipo de job desconhecido: ${job.type}`);
      return;
    }
    try {
      await handler.handle(job);
    } catch (error) {
      await this.handleError(job, lockedAt, error, clock());
      return;
    }
    await this.finish(job, lockedAt, { status: 'DONE' });
  }

  private async handleError(
    job: Job,
    lockedAt: Date,
    error: unknown,
    failedAt: Date,
  ): Promise<void> {
    const lastError = toLastError(error);
    if (error instanceof PermanentJobError || job.attempts >= MAX_ATTEMPTS) {
      await this.fail(job, lockedAt, lastError);
      return;
    }
    const runAt = nextRunAt(job.attempts, failedAt);
    const retried = await this.finish(job, lockedAt, {
      status: 'PENDING',
      lastError,
      runAt,
    });
    if (retried) {
      this.logger.warn('Job vai ser tentado de novo', {
        jobId: job.id,
        type: job.type,
        attempts: job.attempts,
        runAt,
      });
    }
  }

  private async fail(
    job: Job,
    lockedAt: Date,
    lastError: string,
  ): Promise<void> {
    const failed = await this.finish(job, lockedAt, {
      status: 'FAILED',
      lastError,
    });
    if (failed) this.reportFailed(job);
  }

  // Nada do payload sai daqui: ele pode ter dados pessoais.
  private reportFailed(job: Pick<Job, 'id' | 'type' | 'attempts'>): void {
    this.businessEvents.record('job.failed', {
      jobId: job.id,
      type: job.type,
      attempts: job.attempts,
    });
    Sentry.captureException(new Error(`Job ${job.type} falhou`), {
      tags: { jobId: job.id, type: job.type },
    });
  }

  // Só grava se o job ainda é desta rodada: outra instância pode tê-lo
  // retomado depois de 10 minutos travado. Devolve se gravou.
  private async finish(
    job: Job,
    lockedAt: Date,
    changes: Pick<Partial<Job>, 'status' | 'lastError' | 'runAt'>,
  ): Promise<boolean> {
    const result = await this.dataSource
      .createQueryBuilder()
      .update(Job)
      .set(changes)
      .where('id = :id AND status = :running AND "lockedAt" = :lockedAt', {
        id: job.id,
        running: 'RUNNING',
        lockedAt,
      })
      .execute();
    return result.affected === 1;
  }
}
