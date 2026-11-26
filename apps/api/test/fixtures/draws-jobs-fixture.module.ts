import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnvironment } from '../../src/config/env.validation.js';
import { DatabaseModule } from '../../src/database/database.module.js';
import { DrawsModule } from '../../src/draws/draws.module.js';
import { ObservabilityModule } from '../../src/observability/observability.module.js';
import { UsersModule } from '../../src/users/users.module.js';

// Sorteio, fila e e-mail sem HTTP e sem o agendador: o teste roda a fila.
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    DatabaseModule,
    ObservabilityModule,
    UsersModule,
    DrawsModule,
  ],
})
export class DrawsJobsFixtureModule {}
