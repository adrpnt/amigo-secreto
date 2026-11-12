import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApp } from './app.setup.js';
import type { EnvironmentVariables } from './config/env.validation.js';
import { AppLogger } from './observability/app-logger.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService<EnvironmentVariables, true>);
  app.useLogger(new AppLogger(config.get('NODE_ENV', { infer: true })));
  configureApp(app);
  await app.listen(config.get('PORT', { infer: true }));
}
await bootstrap();
