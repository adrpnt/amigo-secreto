import type { ArgumentsHost } from '@nestjs/common';
import type { HttpAdapterHost } from '@nestjs/core';
import { AllExceptionsFilter } from '../observability/all-exceptions.filter.js';
import { EmailInviteLimitException } from './email-invite-limit.exception.js';

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const PREFIX =
  'Este grupo chegou ao limite de 100 convites por e-mail em 24 horas. Tente de novo em';

function messageOf(retryAfterMs: number): string {
  const exception = new EmailInviteLimitException(retryAfterMs);
  expect(exception.getStatus()).toBe(429);
  return (exception.getResponse() as { message: string }).message;
}

// Passa a exceção pelo filtro com uma resposta falsa e devolve o que ela
// recebeu: cabeçalhos, corpo e status.
function reply(exception: unknown) {
  const sent = {
    headers: {} as Record<string, string>,
    body: undefined as unknown,
    status: 0,
  };
  const response = {};
  const adapterHost = {
    httpAdapter: {
      setHeader: (target: unknown, name: string, value: string) => {
        if (target === response) sent.headers[name] = value;
      },
      reply: (target: unknown, body: unknown, status: number) => {
        if (target !== response) return;
        sent.body = body;
        sent.status = status;
      },
    },
  } as unknown as HttpAdapterHost;
  const host = {
    switchToHttp: () => ({ getResponse: () => response }),
  } as unknown as ArgumentsHost;
  new AllExceptionsFilter(adapterHost).catch(exception, host);
  return sent;
}

describe('limite de convites por e-mail', () => {
  it('diz em N horas acima de uma hora', () => {
    expect(messageOf(2 * HOUR_MS + 10 * MINUTE_MS)).toBe(`${PREFIX} 3 horas.`);
    expect(messageOf(HOUR_MS + 1)).toBe(`${PREFIX} 2 horas.`);
    expect(messageOf(23 * HOUR_MS + 59 * MINUTE_MS)).toBe(
      `${PREFIX} 24 horas.`,
    );
  });

  it('diz em 1 hora com exatamente uma hora', () => {
    expect(messageOf(HOUR_MS)).toBe(`${PREFIX} 1 hora.`);
    // 59min30s arredonda para 60 minutos, que já é 1 hora.
    expect(messageOf(59 * MINUTE_MS + 30_000)).toBe(`${PREFIX} 1 hora.`);
  });

  it('diz em N minutos abaixo de uma hora', () => {
    expect(messageOf(59 * MINUTE_MS)).toBe(`${PREFIX} 59 minutos.`);
    expect(messageOf(30 * MINUTE_MS)).toBe(`${PREFIX} 30 minutos.`);
    expect(messageOf(MINUTE_MS + 1)).toBe(`${PREFIX} 2 minutos.`);
    expect(messageOf(MINUTE_MS)).toBe(`${PREFIX} 1 minuto.`);
    expect(messageOf(30_000)).toBe(`${PREFIX} 1 minuto.`);
  });

  it('grava o Retry-After em segundos', () => {
    const sent = reply(
      new EmailInviteLimitException(2 * HOUR_MS + 10 * MINUTE_MS),
    );

    expect(sent.status).toBe(429);
    expect(sent.headers).toEqual({ 'Retry-After': '7800' });
    expect(sent.body).toEqual({
      statusCode: 429,
      message: `${PREFIX} 3 horas.`,
      error: 'Too Many Requests',
    });
    expect(reply(new EmailInviteLimitException(1500)).headers).toEqual({
      'Retry-After': '2',
    });
  });
});
