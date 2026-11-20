import type { SessionUser } from '@amigo-secreto/shared';
import { All, Controller, Get, Module, Post } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../../src/auth/auth.module.js';
import { CurrentUser } from '../../src/auth/decorators/current-user.decorator.js';
import { Public } from '../../src/auth/decorators/public.decorator.js';
import { validateEnvironment } from '../../src/config/env.validation.js';
import { DatabaseModule } from '../../src/database/database.module.js';
import { HealthModule } from '../../src/health/health.module.js';
import { ObservabilityModule } from '../../src/observability/observability.module.js';

@Controller('fixtures/auth')
class AuthFixtureController {
  @Get('protected')
  protectedRoute(@CurrentUser() user: SessionUser): SessionUser {
    return user;
  }

  @All('mutation')
  mutation(): { ok: true } {
    return { ok: true };
  }

  @Public()
  @Post('public-mutation')
  publicMutation(): { ok: true } {
    return { ok: true };
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
    ObservabilityModule,
    AuthModule,
    HealthModule,
  ],
  controllers: [AuthFixtureController],
})
export class AuthFixtureModule {}
