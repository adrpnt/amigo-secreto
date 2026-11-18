import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { isEmail } from 'class-validator';
import { EmailService } from '../email/email.service.js';
import { EmailTestModule } from './email-test.module.js';

async function main(): Promise<number> {
  const to = process.argv[2];
  if (!to || !isEmail(to)) {
    console.error(
      'Informe um e-mail válido: pnpm --filter @amigo-secreto/api email:test <destinatário>',
    );
    return 1;
  }

  const app = await NestFactory.createApplicationContext(EmailTestModule, {
    logger: ['error', 'warn'],
  });
  try {
    const job = await app.get(EmailService).enqueue({
      to,
      subject: 'E-mail de teste do Amigo Secreto',
      blocks: [
        {
          type: 'paragraph',
          text: 'Se você recebeu esta mensagem, o envio de e-mails está funcionando.',
        },
      ],
    });
    console.log(
      `Job ${job.id} enfileirado. A API em execução envia o e-mail em até 10 segundos.`,
    );
    return 0;
  } finally {
    await app.close();
  }
}

process.exitCode = await main();
