import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvironmentVariables } from '../config/env.validation.js';
import { PermanentJobError } from '../jobs/job-errors.js';
import type { EmailTransport } from './email-transport.js';
import type { RenderedEmail } from './email.types.js';

const DEFAULT_FROM = 'Amigo Secreto <onboarding@resend.dev>';
const SEND_TIMEOUT_MS = 10_000;

// O Resend pede para repetir quando outra requisição com a mesma
// Idempotency-Key ainda está em andamento.
const CONCURRENT_IDEMPOTENT_REQUESTS = 'concurrent_idempotent_requests';

function isPermanent(status: number, name: string | undefined): boolean {
  if (status < 400 || status >= 500 || status === 429) {
    return false;
  }
  return !(status === 409 && name === CONCURRENT_IDEMPOTENT_REQUESTS);
}

// Só o status e o name entram no erro: a mensagem do Resend pode repetir o
// destinatário, que não pode ir ao lastError, ao log nem ao Sentry.
async function errorName(response: Response): Promise<string | undefined> {
  try {
    const body = (await response.json()) as { name?: unknown };
    return typeof body.name === 'string' ? body.name : undefined;
  } catch {
    return undefined;
  }
}

@Injectable()
export class ResendTransport implements EmailTransport {
  constructor(
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  async send(email: RenderedEmail, idempotencyKey: string): Promise<void> {
    const response = await this.post(email, idempotencyKey);
    if (response.ok) {
      await response.body?.cancel();
      return;
    }

    const name = await errorName(response);
    const message = ['Resend', response.status, name]
      .filter((part) => part !== undefined)
      .join(' ');
    if (isPermanent(response.status, name)) {
      throw new PermanentJobError(message);
    }
    throw new Error(message);
  }

  private async post(
    email: RenderedEmail,
    idempotencyKey: string,
  ): Promise<Response> {
    const baseUrl = this.config.get('RESEND_BASE_URL', { infer: true });
    const apiKey = this.config.get('RESEND_API_KEY', { infer: true });
    const from = this.config.get('EMAIL_FROM', { infer: true }) || DEFAULT_FROM;

    try {
      return await fetch(`${baseUrl}/emails`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          from,
          to: [email.to],
          subject: email.subject,
          html: email.html,
          text: email.text,
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
