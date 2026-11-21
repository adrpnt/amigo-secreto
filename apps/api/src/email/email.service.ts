import { Injectable } from '@nestjs/common';
import { isEmail } from 'class-validator';
import type { EntityManager } from 'typeorm';
import type { Job } from '../jobs/job.entity.js';
import { JobQueue } from '../jobs/job-queue.service.js';
import type { EmailMessage } from './email.types.js';

export const EMAIL_SEND_JOB = 'email.send';

function isHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

function assertSendable(message: EmailMessage): void {
  if (!isEmail(message.to)) {
    throw new Error('Destinatário de e-mail inválido.');
  }
  for (const block of message.blocks) {
    if (block.type === 'button' && !isHttpUrl(block.url)) {
      throw new Error('URL de botão inválida.');
    }
  }
}

@Injectable()
export class EmailService {
  constructor(private readonly queue: JobQueue) {}

  // As mensagens de erro não levam o destinatário, que não pode ir a logs.
  async enqueue(
    message: EmailMessage,
    options: { runAt?: Date; manager?: EntityManager } = {},
  ): Promise<Job> {
    assertSendable(message);
    return this.queue.enqueue(EMAIL_SEND_JOB, message, options);
  }

  // Confere todas as mensagens antes de gravar qualquer uma: uma inválida
  // recusa a lista inteira.
  async enqueueMany(
    messages: EmailMessage[],
    options: { manager?: EntityManager } = {},
  ): Promise<void> {
    messages.forEach(assertSendable);
    await this.queue.enqueueMany(EMAIL_SEND_JOB, messages, options);
  }
}
