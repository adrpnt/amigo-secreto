import { HttpException, HttpStatus } from '@nestjs/common';

const MINUTE_MS = 60_000;
const SECOND_MS = 1000;

// 429 com o tempo de espera; o AllExceptionsFilter grava o Retry-After.
export class TooManyAttemptsException extends HttpException {
  readonly retryAfterSeconds: number;

  constructor(retryAfterMs: number) {
    const minutes = Math.max(1, Math.ceil(retryAfterMs / MINUTE_MS));
    super(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: `Muitas tentativas. Tente de novo em ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}.`,
        error: 'Too Many Requests',
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
    this.retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / SECOND_MS));
  }
}
