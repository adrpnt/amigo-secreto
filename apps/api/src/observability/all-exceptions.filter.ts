import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { HttpAdapterHost } from '@nestjs/core';
import * as Sentry from '@sentry/nestjs';
import { TooManyAttemptsException } from '../rate-limit/too-many-attempts.exception.js';

const INTERNAL_ERROR = {
  statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
  message: 'Erro interno',
  error: 'Internal Server Error',
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly adapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const isInternalError =
      status === (HttpStatus.INTERNAL_SERVER_ERROR as number);

    if (status >= 500) {
      this.logger.error(
        exception instanceof Error ? exception.message : String(exception),
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    // Só o 500 vai ao Sentry: os outros 5xx (ex.: o 503 do health com o banco fora) são esperados.
    if (isInternalError) {
      Sentry.captureException(exception);
    }

    // Um 500 nunca devolve a mensagem original, mesmo vinda de uma HttpException.
    const body =
      isHttpException && !isInternalError
        ? httpExceptionBody(exception)
        : INTERNAL_ERROR;
    const response: unknown = host.switchToHttp().getResponse();
    const { httpAdapter } = this.adapterHost;
    if (exception instanceof TooManyAttemptsException) {
      httpAdapter.setHeader(
        response,
        'Retry-After',
        String(exception.retryAfterSeconds),
      );
    }
    httpAdapter.reply(response, body, status);
  }
}

function httpExceptionBody(exception: HttpException): object {
  const response = exception.getResponse();
  return typeof response === 'string'
    ? { statusCode: exception.getStatus(), message: response }
    : response;
}
