import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { JobsModule } from './jobs.module.js';
import { JobScheduler } from './job.scheduler.js';

// Os testes chamam a rodada direto, com relógio controlado.
@Module({
  imports: [
    ScheduleModule.forRoot({ cronJobs: process.env.NODE_ENV !== 'test' }),
    JobsModule,
  ],
  providers: [JobScheduler],
})
export class JobsSchedulerModule {}
