import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module.js';
import { validateEnvironment } from './config/env.validation.js';
import { DatabaseModule } from './database/database.module.js';
import { EmailModule } from './email/email.module.js';
import { GroupsModule } from './groups/groups.module.js';
import { HealthModule } from './health/health.module.js';
import { InvitesModule } from './invites/invites.module.js';
import { JobsSchedulerModule } from './jobs/jobs-scheduler.module.js';
import { ObservabilityModule } from './observability/observability.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    DatabaseModule,
    ObservabilityModule,
    HealthModule,
    EmailModule,
    JobsSchedulerModule,
    UsersModule,
    AuthModule,
    GroupsModule,
    InvitesModule,
  ],
})
export class AppModule {}
