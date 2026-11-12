import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AllExceptionsFilter } from './observability/all-exceptions.filter.js';
import { RequestIdMiddleware } from './observability/request-id.middleware.js';

const OPENAPI_CONFIG = new DocumentBuilder()
  .setTitle('Amigo Secreto API')
  .setVersion('0.0.0')
  .build();

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

  // O ConfigModule grava em process.env o NODE_ENV já validado.
  if (process.env.NODE_ENV !== 'production') {
    SwaggerModule.setup('docs', app, () =>
      SwaggerModule.createDocument(app, OPENAPI_CONFIG),
    );
  }
}
