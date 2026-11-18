import type { RenderedEmail } from './email.types.js';

export interface EmailTransport {
  send(email: RenderedEmail, idempotencyKey: string): Promise<void>;
}

export const EMAIL_TRANSPORT = Symbol('EMAIL_TRANSPORT');
