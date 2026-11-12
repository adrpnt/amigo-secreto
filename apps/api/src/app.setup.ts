import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { AllExceptionsFilter } from './observability/all-exceptions.filter.js';
import { RequestIdMiddleware } from './observability/request-id.middleware.js';

export function configureApp(app: INestApplication): void {
  const requestId = new RequestIdMiddleware();
  app.use(requestId.use.bind(requestId));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter(app.get(HttpAdapterHost)));
}
