import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../../src/auth/auth.module.js';
import { validateEnvironment } from '../../src/config/env.validation.js';
import { DatabaseModule } from '../../src/database/database.module.js';
import { GroupsModule } from '../../src/groups/groups.module.js';
import { InvitesModule } from '../../src/invites/invites.module.js';
import { ObservabilityModule } from '../../src/observability/observability.module.js';
import { UsersModule } from '../../src/users/users.module.js';

// Rotas de grupo e de convite com sessão e CSRF, sem o agendador de jobs do AppModule.
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    DatabaseModule,
    ObservabilityModule,
    AuthModule,
    UsersModule,
    GroupsModule,
    InvitesModule,
  ],
})
export class GroupsApiFixtureModule {}
