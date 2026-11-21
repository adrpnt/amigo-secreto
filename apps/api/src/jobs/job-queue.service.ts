import { Injectable } from '@nestjs/common';
import {
  DataSource,
  type EntityManager,
  type QueryDeepPartialEntity,
} from 'typeorm';
import { Job } from './job.entity.js';

// Linhas por INSERT: com 5 parâmetros por linha, fica longe do limite de
// 65.535 parâmetros de uma instrução do Postgres.
const INSERT_BATCH_SIZE = 1000;

@Injectable()
export class JobQueue {
  constructor(private readonly dataSource: DataSource) {}

  async enqueue<P extends object>(
    type: string,
    payload: P,
    options: { runAt?: Date; manager?: EntityManager } = {},
  ): Promise<Job> {
    const manager = options.manager ?? this.dataSource.manager;
    return manager.save(
      manager.create(Job, {
        type,
        payload: payload as Record<string, unknown>,
        runAt: options.runAt ?? new Date(),
        status: 'PENDING',
        attempts: 0,
      }),
    );
  }

  // Um job por item, gravados com um INSERT de várias linhas por lote; todos
  // os lotes vão na transação do manager recebido.
  async enqueueMany<P extends object>(
    type: string,
    payloads: P[],
    options: { manager?: EntityManager } = {},
  ): Promise<void> {
    if (payloads.length === 0) return;
    const manager = options.manager ?? this.dataSource.manager;
    const runAt = new Date();
    for (let start = 0; start < payloads.length; start += INSERT_BATCH_SIZE) {
      await manager
        .createQueryBuilder()
        .insert()
        .into(Job)
        .values(
          payloads
            .slice(start, start + INSERT_BATCH_SIZE)
            .map((payload): QueryDeepPartialEntity<Job> => ({
              type,
              payload,
              runAt,
              status: 'PENDING',
              attempts: 0,
            })),
        )
        .execute();
    }
  }
}
