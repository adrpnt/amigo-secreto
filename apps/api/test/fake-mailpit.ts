import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';

export type FakeMailpitRequest = {
  url?: string;
  body: Record<string, unknown>;
};

export type FakeMailpit = {
  url: string;
  requests: FakeMailpitRequest[];
  reset(): void;
  close(): Promise<void>;
};

// Servidor no lugar do Mailpit: grava cada requisição e responde 200 com o
// ID da mensagem, como a API HTTP dele.
export async function startFakeMailpit(): Promise<FakeMailpit> {
  const requests: FakeMailpitRequest[] = [];

  const server = createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on('data', (chunk: Buffer) => chunks.push(chunk));
    request.on('end', () => {
      requests.push({
        url: request.url,
        body: JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<
          string,
          unknown
        >,
      });
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ ID: `mailpit-${requests.length}` }));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const { port } = server.address() as AddressInfo;

  return {
    url: `http://127.0.0.1:${port}`,
    requests,
    reset() {
      requests.length = 0;
    },
    async close() {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    },
  };
}
