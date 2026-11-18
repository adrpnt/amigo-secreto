import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Job } from './job.entity.js';
import { JobHandlerRegistry } from './job-handler.registry.js';
import { JobQueue } from './job-queue.service.js';
import { JobRunner } from './job-runner.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Job])],
  providers: [JobQueue, JobHandlerRegistry, JobRunner],
  exports: [JobQueue, JobHandlerRegistry, JobRunner],
})
export class JobsModule {}
