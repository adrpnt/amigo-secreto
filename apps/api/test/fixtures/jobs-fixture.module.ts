import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnvironment } from '../../src/config/env.validation.js';
import { DatabaseModule } from '../../src/database/database.module.js';
import { JobsModule } from '../../src/jobs/jobs.module.js';
import { ObservabilityModule } from '../../src/observability/observability.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    DatabaseModule,
    ObservabilityModule,
    JobsModule,
  ],
})
export class JobsFixtureModule {}
