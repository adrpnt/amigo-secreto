import { Injectable, Logger } from '@nestjs/common';
import type { EmailTransport } from './email-transport.js';
import type { RenderedEmail } from './email.types.js';

// Fora de produção sem RESEND_API_KEY nem MAILPIT_URL: o e-mail fica no log para quem
// desenvolve. A validação do ambiente impede este transporte em produção.
@Injectable()
export class LogTransport implements EmailTransport {
  private readonly logger = new Logger('Email');

  send(email: RenderedEmail): Promise<void> {
    this.logger.log('E-mail não enviado: RESEND_API_KEY ausente', {
      to: email.to,
      subject: email.subject,
      text: email.text,
    });
    return Promise.resolve();
  }
}
