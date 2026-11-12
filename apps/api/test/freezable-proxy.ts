import { createServer, connect, type Server, type Socket } from 'node:net';

export type FreezableProxy = {
  url: string;
  freeze(): void;
  thaw(): void;
  close(): Promise<void>;
};

// Proxy TCP entre a API e o Postgres. Congelado, descarta os bytes nos dois
// sentidos, como um banco que aceita a conexão e para de responder.
export async function startFreezableProxy(
  databaseUrl: string,
): Promise<FreezableProxy> {
  const target = new URL(databaseUrl);
  const sockets = new Set<Socket>();
  let isFrozen = false;

  const track = (socket: Socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
    socket.on('error', () => socket.destroy());
  };

  const server: Server = createServer((client) => {
    const upstream = connect(Number(target.port), target.hostname);
    track(client);
    track(upstream);
    client.on('data', (chunk) => {
      if (!isFrozen) upstream.write(chunk);
    });
    upstream.on('data', (chunk) => {
      if (!isFrozen) client.write(chunk);
    });
    client.on('close', () => upstream.destroy());
    upstream.on('close', () => client.destroy());
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (address === null || typeof address === 'string') {
    throw new Error('O proxy não abriu uma porta TCP.');
  }

  const url = new URL(databaseUrl);
  url.hostname = '127.0.0.1';
  url.port = String(address.port);

  const destroySockets = () => {
    for (const socket of sockets) socket.destroy();
  };

  return {
    url: url.href,
    freeze() {
      isFrozen = true;
    },
    // Derruba as conexões que perderam bytes e volta a repassar o tráfego.
    thaw() {
      destroySockets();
      isFrozen = false;
    },
    close() {
      destroySockets();
      return new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    },
  };
}
