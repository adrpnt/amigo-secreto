import { Controller, Get, Module, Param } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnvironment } from '../../src/config/env.validation.js';
import { DatabaseModule } from '../../src/database/database.module.js';
import { RateLimitModule } from '../../src/rate-limit/rate-limit.module.js';
import { RateLimitService } from '../../src/rate-limit/rate-limit.service.js';

export const FIXTURE_LIMIT = 1;
export const FIXTURE_WINDOW_MS = 10 * 60_000;

@Controller('fixtures/rate-limit')
class RateLimitFixtureController {
  constructor(private readonly rateLimit: RateLimitService) {}

  @Get(':key')
  async attempt(@Param('key') key: string): Promise<{ ok: true }> {
    await this.rateLimit.assertWithinLimits([
      { key, limit: FIXTURE_LIMIT, windowMs: FIXTURE_WINDOW_MS },
    ]);
    return { ok: true };
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    DatabaseModule,
    RateLimitModule,
  ],
  controllers: [RateLimitFixtureController],
})
export class RateLimitFixtureModule {}
