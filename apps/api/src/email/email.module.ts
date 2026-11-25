import { Module, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvironmentVariables } from '../config/env.validation.js';
import { JobHandlerRegistry } from '../jobs/job-handler.registry.js';
import { JobsModule } from '../jobs/jobs.module.js';
import { EmailSender } from './email-sender.js';
import { EMAIL_TRANSPORT } from './email-transport.js';
import { EMAIL_SEND_JOB, EmailService } from './email.service.js';
import { LogTransport } from './log.transport.js';
import { MailpitTransport } from './mailpit.transport.js';
import { ResendTransport } from './resend.transport.js';
import { SendEmailHandler } from './send-email.handler.js';

@Module({
  imports: [JobsModule],
  providers: [
    EmailService,
    EmailSender,
    SendEmailHandler,
    {
      provide: EMAIL_TRANSPORT,
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentVariables, true>) => {
        if (config.get('RESEND_API_KEY', { infer: true })) {
          return new ResendTransport(config);
        }
        if (config.get('MAILPIT_URL', { infer: true })) {
          return new MailpitTransport(config);
        }
        return new LogTransport();
      },
    },
  ],
  exports: [EmailService, EmailSender],
})
export class EmailModule implements OnModuleInit {
  constructor(
    private readonly handlers: JobHandlerRegistry,
    private readonly sendEmail: SendEmailHandler,
  ) {}

  onModuleInit(): void {
    this.handlers.register(EMAIL_SEND_JOB, this.sendEmail);
  }
}
