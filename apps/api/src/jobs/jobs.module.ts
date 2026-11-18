import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Job } from './job.entity.js';
import { JobQueue } from './job-queue.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Job])],
  providers: [JobQueue],
  exports: [JobQueue],
})
export class JobsModule {}
