import { Injectable } from '@nestjs/common';
import type { Job } from '../jobs/job.entity.js';
import type { JobHandler } from '../jobs/job-handler.registry.js';
import { EmailSender } from './email-sender.js';
import type { EmailMessage } from './email.types.js';

@Injectable()
export class SendEmailHandler implements JobHandler {
  constructor(private readonly sender: EmailSender) {}

  async handle(job: Job): Promise<void> {
    await this.sender.send(job.payload as EmailMessage, job.id);
  }
}
