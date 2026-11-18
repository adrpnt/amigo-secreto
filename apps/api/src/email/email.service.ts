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

@Injectable()
export class EmailService {
  constructor(private readonly queue: JobQueue) {}

  // As mensagens de erro não levam o destinatário, que não pode ir a logs.
  async enqueue(
    message: EmailMessage,
    options: { runAt?: Date; manager?: EntityManager } = {},
  ): Promise<Job> {
    if (!isEmail(message.to)) {
      throw new Error('Destinatário de e-mail inválido.');
    }
    for (const block of message.blocks) {
      if (block.type === 'button' && !isHttpUrl(block.url)) {
        throw new Error('URL de botão inválida.');
      }
    }
    return this.queue.enqueue(EMAIL_SEND_JOB, message, options);
  }
}
