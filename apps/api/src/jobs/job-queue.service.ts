import { Injectable } from '@nestjs/common';
import { DataSource, type EntityManager } from 'typeorm';
import { Job } from './job.entity.js';

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
}
