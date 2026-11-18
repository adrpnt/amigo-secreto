export const MAX_ATTEMPTS = 5;
export const STUCK_AFTER_MS = 10 * 60_000;
export const BATCH_SIZE = 50;

const BACKOFF_BASE_MS = 60_000;
const LAST_ERROR_MAX_LENGTH = 500;

// Esperas de 1, 5, 25 e 125 minutos depois das tentativas 1 a 4.
export function nextRunAt(attempts: number, failedAt: Date): Date {
  return new Date(failedAt.getTime() + BACKOFF_BASE_MS * 5 ** (attempts - 1));
}

export function toLastError(error: unknown): string {
  const text =
    error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  // O PostgreSQL recusa U+0000 em texto.
  return text.replaceAll('\u0000', '').slice(0, LAST_ERROR_MAX_LENGTH);
}
