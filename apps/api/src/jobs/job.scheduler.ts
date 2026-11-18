import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { JobRunner } from './job-runner.service.js';

@Injectable()
export class JobScheduler {
  constructor(private readonly runner: JobRunner) {}

  // waitForCompletion pula os ticks enquanto a rodada anterior roda.
  @Cron('*/10 * * * * *', { name: 'jobs', waitForCompletion: true })
  tick(): Promise<void> {
    return this.runner.runRound();
  }
}
