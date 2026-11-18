import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnvironment } from '../config/env.validation.js';
import { DatabaseModule } from '../database/database.module.js';
import { EmailModule } from '../email/email.module.js';
import { ObservabilityModule } from '../observability/observability.module.js';

// O AppModule sem o agendador: o comando só enfileira; quem envia é a API em
// execução.
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    DatabaseModule,
    ObservabilityModule,
    EmailModule,
  ],
})
export class EmailTestModule {}
