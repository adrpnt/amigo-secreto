import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvironmentVariables } from '../config/env.validation.js';
import { PermanentJobError } from '../jobs/job-errors.js';
import type { EmailTransport } from './email-transport.js';
import type { RenderedEmail } from './email.types.js';

const DEFAULT_FROM = 'Amigo Secreto <nao-responda@amigo-secreto.local>';
const SEND_TIMEOUT_MS = 10_000;

// "Nome <email>"; sem os sinais, o texto todo é o e-mail.
const NAMED_ADDRESS = /^(.*?)\s*<([^>]+)>$/;

type MailpitAddress = { Name: string; Email: string };

function toMailpitAddress(address: string): MailpitAddress {
  const match = NAMED_ADDRESS.exec(address.trim());
  if (!match) {
    return { Name: '', Email: address.trim() };
  }
  return { Name: match[1] ?? '', Email: match[2] ?? '' };
}

// Fora de produção, sem RESEND_API_KEY e com MAILPIT_URL: o e-mail vai para
// a caixa de entrada local do Mailpit, pela API HTTP dele. O Mailpit não tem
// Idempotency-Key; uma nova tentativa pode repetir o e-mail na caixa local.
@Injectable()
export class MailpitTransport implements EmailTransport {
  constructor(
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  async send(email: RenderedEmail): Promise<void> {
    const response = await this.post(email);
    // Só o status entra no erro: a mensagem do Mailpit pode repetir o
    // destinatário, que não pode ir ao lastError, ao log nem ao Sentry.
    await response.body?.cancel();
    if (response.ok) {
      return;
    }

    const message = `Mailpit ${response.status}`;
    if (response.status >= 400 && response.status < 500) {
      throw new PermanentJobError(message);
    }
    throw new Error(message);
  }

  private async post(email: RenderedEmail): Promise<Response> {
    const baseUrl = this.config.get('MAILPIT_URL', { infer: true });
    const from = this.config.get('EMAIL_FROM', { infer: true }) || DEFAULT_FROM;

    try {
      return await fetch(`${baseUrl}/api/v1/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          From: toMailpitAddress(from),
          To: [{ Name: '', Email: email.to }],
          Subject: email.subject,
          HTML: email.html,
          Text: email.text,
        }),
        signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        throw new Error('Tempo esgotado');
      }
      throw new Error('Falha de rede');
    }
  }
}
