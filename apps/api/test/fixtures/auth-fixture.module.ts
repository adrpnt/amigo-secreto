import type { SessionUser } from '@amigo-secreto/shared';
import { Controller, Get, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../../src/auth/auth.module.js';
import { CurrentUser } from '../../src/auth/decorators/current-user.decorator.js';
import { Public } from '../../src/auth/decorators/public.decorator.js';
import { validateEnvironment } from '../../src/config/env.validation.js';
import { DatabaseModule } from '../../src/database/database.module.js';
import { HealthModule } from '../../src/health/health.module.js';

@Controller('fixtures/auth')
class AuthFixtureController {
  @Get('protected')
  protectedRoute(@CurrentUser() user: SessionUser): SessionUser {
    return user;
  }

  @Public()
  @Get('public')
  publicRoute(): { ok: true } {
    return { ok: true };
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    DatabaseModule,
    AuthModule,
    HealthModule,
  ],
  controllers: [AuthFixtureController],
})
export class AuthFixtureModule {}
