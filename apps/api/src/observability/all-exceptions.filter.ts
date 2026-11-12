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
      Sentry.captureException(exception);
    }

    // Um 500 nunca devolve a mensagem original, mesmo vinda de uma HttpException.
    const body =
      isHttpException && !isInternalError
        ? httpExceptionBody(exception)
        : INTERNAL_ERROR;
    this.adapterHost.httpAdapter.reply(
      host.switchToHttp().getResponse(),
      body,
      status,
    );
  }
}

function httpExceptionBody(exception: HttpException): object {
  const response = exception.getResponse();
  return typeof response === 'string'
    ? { statusCode: exception.getStatus(), message: response }
    : response;
}
