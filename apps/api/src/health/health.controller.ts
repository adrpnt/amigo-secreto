import type { HealthResponse } from '@amigo-secreto/shared';
import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';

const DATABASE_TIMEOUT_MS = 3000;

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly database: TypeOrmHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  async check(): Promise<HealthResponse> {
    const result = await this.health.check([
      () =>
        this.database.pingCheck('database').withTimeout(DATABASE_TIMEOUT_MS),
    ]);
    // Com o banco fora, o Terminus lança 503 antes de chegar aqui; sem
    // indicadores "degraded" nem shutdown hooks, o status que sobra é "ok".
    return result as HealthResponse;
  }
}
