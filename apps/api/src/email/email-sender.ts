import { Inject, Injectable } from '@nestjs/common';
import { BusinessEventsService } from '../observability/business-events.service.js';
import { renderEmail } from './email-layout.js';
import { EMAIL_TRANSPORT, type EmailTransport } from './email-transport.js';
import type { EmailMessage } from './email.types.js';

// Entrega de e-mail para os handlers de job: monta, envia e conta o envio.
@Injectable()
export class EmailSender {
  constructor(
    @Inject(EMAIL_TRANSPORT) private readonly transport: EmailTransport,
    private readonly businessEvents: BusinessEventsService,
  ) {}

  // A mesma chave em todas as tentativas do job: o Resend não manda duas
  // vezes o e-mail que já aceitou.
  async send(message: EmailMessage, jobId: string): Promise<void> {
    const email = renderEmail(message);
    await this.transport.send(email, `email/${jobId}`);
    this.businessEvents.record('email.sent', { jobId });
  }
}
