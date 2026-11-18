import { Inject, Injectable } from '@nestjs/common';
import type { Job } from '../jobs/job.entity.js';
import type { JobHandler } from '../jobs/job-handler.registry.js';
import { BusinessEventsService } from '../observability/business-events.service.js';
import { renderEmail } from './email-layout.js';
import { EMAIL_TRANSPORT, type EmailTransport } from './email-transport.js';
import type { EmailMessage } from './email.types.js';

@Injectable()
export class SendEmailHandler implements JobHandler {
  constructor(
    @Inject(EMAIL_TRANSPORT) private readonly transport: EmailTransport,
    private readonly businessEvents: BusinessEventsService,
  ) {}

  // A mesma chave em todas as tentativas: o Resend não manda duas vezes o
  // e-mail que já aceitou.
  async handle(job: Job): Promise<void> {
    const email = renderEmail(job.payload as EmailMessage);
    await this.transport.send(email, `email/${job.id}`);
    this.businessEvents.record('email.sent', { jobId: job.id });
  }
}
