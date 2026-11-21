import { createServer, type IncomingHttpHeaders, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { ConfigService } from '@nestjs/config';
import type { EnvironmentVariables } from '../config/env.validation.js';
import { PermanentJobError } from '../jobs/job-errors.js';
import type { RenderedEmail } from './email.types.js';
import { MailpitTransport } from './mailpit.transport.js';

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

describe('MailpitTransport', () => {
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
    reply = { status: 200, body: JSON.stringify({ ID: 'mailpit-id' }) };
  });

  const transportFor = (
    mailpitUrl = baseUrl,
    emailFrom = 'Amigo Secreto <nao-responda@amigo.example>',
  ) =>
    new MailpitTransport(
      new ConfigService<EnvironmentVariables, true>({
        MAILPIT_URL: mailpitUrl,
        EMAIL_FROM: emailFrom,
      }),
    );

  async function sendError(response: FakeResponse): Promise<Error> {
    reply = response;
    const error: unknown = await transportFor()
      .send(EMAIL)
      .catch((e: unknown) => e);
    if (!(error instanceof Error)) {
      throw new Error('O envio deveria ter falhado');
    }
    return error;
  }

  const sentBody = () =>
    JSON.parse(requests[0]?.body ?? '') as Record<string, unknown>;

  it('envia destinatário, assunto, HTML, texto e remetente para /api/v1/send', async () => {
    await expect(transportFor().send(EMAIL)).resolves.toBeUndefined();

    expect(requests).toHaveLength(1);
    const [request] = requests;
    expect(request?.method).toBe('POST');
    expect(request?.url).toBe('/api/v1/send');
    expect(request?.headers['content-type']).toContain('application/json');
    expect(sentBody()).toEqual({
      From: { Name: 'Amigo Secreto', Email: 'nao-responda@amigo.example' },
      To: [{ Name: '', Email: 'ana@example.com' }],
      Subject: 'Resultado do sorteio',
      HTML: '<p>Você tirou a Bia.</p>',
      Text: 'Você tirou a Bia.',
    });
  });

  it('usa o remetente Amigo Secreto <nao-responda@amigo-secreto.local> sem EMAIL_FROM', async () => {
    await transportFor(baseUrl, '').send(EMAIL);

    expect(sentBody().From).toEqual({
      Name: 'Amigo Secreto',
      Email: 'nao-responda@amigo-secreto.local',
    });
  });

  it('aceita EMAIL_FROM só com o endereço', async () => {
    await transportFor(baseUrl, 'nao-responda@amigo.example').send(EMAIL);

    expect(sentBody().From).toEqual({
      Name: '',
      Email: 'nao-responda@amigo.example',
    });
  });

  it('trata 4xx como falha definitiva, sem a mensagem do Mailpit', async () => {
    for (const status of [400, 413, 499]) {
      const error = await sendError({
        status,
        body: JSON.stringify({ Error: 'invalid To address: ana@example.com' }),
      });

      expect(error).toBeInstanceOf(PermanentJobError);
      expect(error.message).toBe(`Mailpit ${status}`);
    }
  });

  it('trata 5xx como falha passageira', async () => {
    for (const status of [500, 503]) {
      const error = await sendError({ status, body: '' });

      expect(error).not.toBeInstanceOf(PermanentJobError);
      expect(error.message).toBe(`Mailpit ${status}`);
    }
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
      .send(EMAIL)
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(PermanentJobError);
    expect((error as Error).message).toBe('Falha de rede');
  });
});
