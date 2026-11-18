import { Module } from '@nestjs/common';
import { JobsModule } from '../jobs/jobs.module.js';
import { EmailService } from './email.service.js';

@Module({
  imports: [JobsModule],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
