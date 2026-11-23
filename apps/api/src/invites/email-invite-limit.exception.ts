import { HttpException, HttpStatus } from '@nestjs/common';

const SECOND_MS = 1000;
const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

// Arredonda para cima, para nunca mandar tentar antes da hora; 60 minutos
// ou mais vira horas.
function waitText(retryAfterMs: number): string {
  const minutes = Math.max(1, Math.ceil(retryAfterMs / MINUTE_MS));
  if (minutes < 60) {
    return `${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
  }
  const hours = Math.ceil(retryAfterMs / HOUR_MS);
  return `${hours} ${hours === 1 ? 'hora' : 'horas'}`;
}

// 429 do limite de convites por e-mail do grupo; o AllExceptionsFilter grava
// o Retry-After.
export class EmailInviteLimitException extends HttpException {
  readonly retryAfterSeconds: number;

  constructor(retryAfterMs: number) {
    super(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: `Este grupo chegou ao limite de 100 convites por e-mail em 24 horas. Tente de novo em ${waitText(retryAfterMs)}.`,
        error: 'Too Many Requests',
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
    this.retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / SECOND_MS));
  }
}
