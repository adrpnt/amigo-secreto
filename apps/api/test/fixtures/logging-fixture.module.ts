import { Controller, Get, Logger, Module } from '@nestjs/common';

export const FIXTURE_LOG_MESSAGE = 'Rota de teste chamada';

@Controller('fixtures/logging')
class LoggingFixtureController {
  private readonly logger = new Logger(LoggingFixtureController.name);

  @Get()
  handle(): { done: boolean } {
    this.logger.log(FIXTURE_LOG_MESSAGE);
    return { done: true };
  }
}

@Module({ controllers: [LoggingFixtureController] })
export class LoggingFixtureModule {}
