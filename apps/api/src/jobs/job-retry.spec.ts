import { PermanentJobError } from './job-errors.js';
import { nextRunAt, toLastError } from './job-retry.js';

const MINUTE_MS = 60_000;

describe('nextRunAt', () => {
  it('soma 1, 5, 25 e 125 minutos ao instante da falha nas tentativas 1 a 4', () => {
    const failedAt = new Date('2026-11-18T10:00:00.000Z');

    const waits = [1, 2, 3, 4].map(
      (attempts) =>
        (nextRunAt(attempts, failedAt).getTime() - failedAt.getTime()) /
        MINUTE_MS,
    );

    expect(waits).toEqual([1, 5, 25, 125]);
    expect(failedAt.toISOString()).toBe('2026-11-18T10:00:00.000Z');
  });
});

describe('toLastError', () => {
  it('corta a mensagem em 500 caracteres', () => {
    const longError = new TypeError('x'.repeat(600));

    const lastError = toLastError(longError);

    expect(lastError).toHaveLength(500);
    expect(lastError).toBe(`TypeError: ${'x'.repeat(489)}`);
    expect(
      toLastError(new PermanentJobError('Resend 422 validation_error')),
    ).toBe('PermanentJobError: Resend 422 validation_error');
    expect(toLastError(new Error('Tempo esgotado'))).toBe(
      'Error: Tempo esgotado',
    );
  });

  it('usa String do valor quando o erro não é Error', () => {
    expect(toLastError('falhou')).toBe('falhou');
    expect(toLastError(42)).toBe('42');
    expect(toLastError(undefined)).toBe('undefined');
    expect(toLastError('y'.repeat(600))).toBe('y'.repeat(500));
  });
});
