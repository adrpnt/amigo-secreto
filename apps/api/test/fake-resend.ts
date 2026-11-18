import { createServer, type IncomingHttpHeaders } from 'node:http';
import type { AddressInfo } from 'node:net';

export type FakeResendRequest = {
  url?: string;
  headers: IncomingHttpHeaders;
  body: Record<string, unknown>;
};

export type FakeResendReply = { status: number; name?: string };

export type FakeResend = {
  url: string;
  requests: FakeResendRequest[];
  // Respostas das próximas requisições, na ordem; depois delas, 200.
  replyWith(...replies: FakeResendReply[]): void;
  reset(): void;
  close(): Promise<void>;
};

// Servidor no lugar do Resend: grava cada requisição e responde o status
// configurado, com o corpo de erro no formato do Resend.
export async function startFakeResend(): Promise<FakeResend> {
  const requests: FakeResendRequest[] = [];
  let replies: FakeResendReply[] = [];

  const server = createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on('data', (chunk: Buffer) => chunks.push(chunk));
    request.on('end', () => {
      requests.push({
        url: request.url,
        headers: request.headers,
        body: JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<
          string,
          unknown
        >,
      });
      const { status, name } = replies.shift() ?? { status: 200 };
      const body =
        status < 300
          ? { id: `resend-${requests.length}` }
          : { statusCode: status, name, message: 'Erro do Resend falso' };
      response.writeHead(status, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify(body));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const { port } = server.address() as AddressInfo;

  return {
    url: `http://127.0.0.1:${port}`,
    requests,
    replyWith(...next) {
      replies = next;
    },
    reset() {
      requests.length = 0;
      replies = [];
    },
    async close() {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    },
  };
}
