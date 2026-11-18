import { createServer, type IncomingHttpHeaders, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { ConfigService } from '@nestjs/config';
import type { EnvironmentVariables } from '../config/env.validation.js';
import { PermanentJobError } from '../jobs/job-errors.js';
import type { RenderedEmail } from './email.types.js';
import { ResendTransport } from './resend.transport.js';

type RecordedRequest = {
  method?: string;
  url?: string;
  headers: IncomingHttpHeaders;
  body: string;
};

type FakeResponse = { status: number; body?: string; delayMs?: number };

const EMAIL: RenderedEmail = {
  to: 'ana@example.com',
  subject: 'Resultado do sorteio',
  html: '<p>Você tirou a Bia.</p>',
  text: 'Você tirou a Bia.',
};

const errorBody = (statusCode: number, name: string) =>
  JSON.stringify({ statusCode, name, message: 'Mensagem do Resend' });

describe('ResendTransport', () => {
  let server: Server;
  let baseUrl: string;
  const requests: RecordedRequest[] = [];
  let reply: FakeResponse = { status: 200 };

  beforeAll(async () => {
    server = createServer((request, response) => {
      const chunks: Buffer[] = [];
      request.on('data', (chunk: Buffer) => chunks.push(chunk));
      request.on('end', () => {
        requests.push({
          method: request.method,
          url: request.url,
          headers: request.headers,
          body: Buffer.concat(chunks).toString('utf8'),
        });
        const { status, body = '', delayMs = 0 } = reply;
        setTimeout(() => {
          if (response.destroyed) return;
          response.writeHead(status, { 'Content-Type': 'application/json' });
          response.end(body);
        }, delayMs);
      });
    });
    await new Promise<void>((resolve) => server.listen(0, resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  });

  beforeEach(() => {
    requests.length = 0;
    reply = { status: 200, body: JSON.stringify({ id: 'resend-id' }) };
  });

  const transportFor = (resendBaseUrl = baseUrl) =>
    new ResendTransport(
      new ConfigService<EnvironmentVariables, true>({
        RESEND_API_KEY: 're_test_key',
        EMAIL_FROM: 'Amigo Secreto <nao-responda@amigo.example>',
        RESEND_BASE_URL: resendBaseUrl,
      }),
    );

  async function sendError(response: FakeResponse): Promise<Error> {
    reply = response;
    const error: unknown = await transportFor()
      .send(EMAIL, 'email/job-1')
      .catch((e: unknown) => e);
    if (!(error instanceof Error)) {
      throw new Error('O envio deveria ter falhado');
    }
    return error;
  }

  it('envia destinatário, assunto, HTML, texto, remetente, Authorization e Idempotency-Key', async () => {
    await expect(
      transportFor().send(EMAIL, 'email/0b6c7e1e-job'),
    ).resolves.toBeUndefined();

    expect(requests).toHaveLength(1);
    const [request] = requests;
    expect(request?.method).toBe('POST');
    expect(request?.url).toBe('/emails');
    expect(request?.headers.authorization).toBe('Bearer re_test_key');
    expect(request?.headers['content-type']).toContain('application/json');
    expect(request?.headers['idempotency-key']).toBe('email/0b6c7e1e-job');
    expect(JSON.parse(request?.body ?? '')).toEqual({
      from: 'Amigo Secreto <nao-responda@amigo.example>',
      to: ['ana@example.com'],
      subject: 'Resultado do sorteio',
      html: '<p>Você tirou a Bia.</p>',
      text: 'Você tirou a Bia.',
    });
  });

  it('trata 429 como falha passageira', async () => {
    const error = await sendError({
      status: 429,
      body: errorBody(429, 'rate_limit_exceeded'),
    });

    expect(error).not.toBeInstanceOf(PermanentJobError);
    expect(error.message).toBe('Resend 429 rate_limit_exceeded');
  });

  it('trata 409 concurrent_idempotent_requests como falha passageira', async () => {
    const error = await sendError({
      status: 409,
      body: errorBody(409, 'concurrent_idempotent_requests'),
    });

    expect(error).not.toBeInstanceOf(PermanentJobError);
    expect(error.message).toBe('Resend 409 concurrent_idempotent_requests');
  });

  it('trata 500 como falha passageira', async () => {
    const error = await sendError({
      status: 500,
      body: errorBody(500, 'internal_server_error'),
    });
    const withoutJson = await sendError({ status: 502, body: '<html>' });

    expect(error).not.toBeInstanceOf(PermanentJobError);
    expect(error.message).toBe('Resend 500 internal_server_error');
    expect(withoutJson).not.toBeInstanceOf(PermanentJobError);
    expect(withoutJson.message).toBe('Resend 502');
  });

  it('trata resposta depois de 10 segundos como falha passageira', async () => {
    const startedAt = Date.now();

    const error = await sendError({ status: 200, delayMs: 10_500 });

    const elapsed = Date.now() - startedAt;
    expect(error).not.toBeInstanceOf(PermanentJobError);
    expect(error.message).toBe('Tempo esgotado');
    expect(elapsed).toBeGreaterThanOrEqual(10_000);
    expect(elapsed).toBeLessThan(10_500);
  }, 15_000);

  it('trata falha de conexão como falha passageira', async () => {
    const closed = createServer();
    await new Promise<void>((resolve) => closed.listen(0, resolve));
    const { port } = closed.address() as AddressInfo;
    await new Promise((resolve) => closed.close(resolve));

    const error: unknown = await transportFor(`http://127.0.0.1:${port}`)
      .send(EMAIL, 'email/job-1')
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(PermanentJobError);
    expect((error as Error).message).toBe('Falha de rede');
  });

  it('trata 422 como falha definitiva', async () => {
    const error = await sendError({
      status: 422,
      body: errorBody(422, 'validation_error'),
    });

    expect(error).toBeInstanceOf(PermanentJobError);
    expect(error.message).toBe('Resend 422 validation_error');

    // Os outros 4xx, nas bordas da faixa e o 409 sem name.
    const others = [
      { status: 400, name: 'validation_error' },
      { status: 401, name: 'missing_api_key' },
      { status: 404, name: 'not_found' },
      { status: 499, name: 'client_closed_request' },
    ];
    for (const { status, name } of others) {
      const other = await sendError({ status, body: errorBody(status, name) });

      expect(other).toBeInstanceOf(PermanentJobError);
      expect(other.message).toBe(`Resend ${status} ${name}`);
    }
    const conflict = await sendError({ status: 409, body: '{}' });
    expect(conflict).toBeInstanceOf(PermanentJobError);
    expect(conflict.message).toBe('Resend 409');
  });

  it('trata 409 invalid_idempotent_request como falha definitiva', async () => {
    const error = await sendError({
      status: 409,
      body: errorBody(409, 'invalid_idempotent_request'),
    });

    expect(error).toBeInstanceOf(PermanentJobError);
    expect(error.message).toBe('Resend 409 invalid_idempotent_request');
  });
});
