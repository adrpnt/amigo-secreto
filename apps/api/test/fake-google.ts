import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';

export type FakeGoogleClaims = Record<string, unknown>;

export type FakeGoogleReply = {
  status?: number;
  // Claims que sobrescrevem as padrão do id_token (valor undefined remove).
  claims?: FakeGoogleClaims;
  delayMs?: number;
};

export type FakeGoogle = {
  authUrl: string;
  tokenUrl: string;
  // Corpo de cada POST ao endpoint de token, já decodificado do formulário.
  requests: Record<string, string>[];
  defaultClaims(): FakeGoogleClaims;
  // Respostas das próximas trocas de code, na ordem; depois delas, 200 com
  // as claims padrão.
  replyWith(...replies: FakeGoogleReply[]): void;
  reset(): void;
  close(): Promise<void>;
};

const base64url = (value: unknown) =>
  Buffer.from(JSON.stringify(value)).toString('base64url');

// O cliente não confere a assinatura, então ela é um texto qualquer.
export function idTokenFor(claims: FakeGoogleClaims): string {
  return `${base64url({ alg: 'RS256', kid: 'google-falso' })}.${base64url(claims)}.assinatura-falsa`;
}

// Servidor no lugar do Google: responde ao endpoint de token com um id_token
// emitido para o clientId informado.
export async function startFakeGoogle(clientId: string): Promise<FakeGoogle> {
  const requests: Record<string, string>[] = [];
  let replies: FakeGoogleReply[] = [];

  const defaultClaims = (): FakeGoogleClaims => {
    const now = Math.floor(Date.now() / 1000);
    return {
      iss: 'https://accounts.google.com',
      aud: clientId,
      sub: 'google-sub-1',
      email: 'ana@example.com',
      email_verified: true,
      name: 'Ana Souza',
      picture: 'https://lh3.googleusercontent.com/a/ana',
      iat: now,
      exp: now + 3600,
    };
  };

  const server = createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on('data', (chunk: Buffer) => chunks.push(chunk));
    request.on('end', () => {
      requests.push(
        Object.fromEntries(
          new URLSearchParams(Buffer.concat(chunks).toString('utf8')),
        ),
      );
      const { status = 200, claims = {}, delayMs = 0 } = replies.shift() ?? {};
      const body =
        status < 300
          ? {
              access_token: 'access-token-falso',
              expires_in: 3599,
              token_type: 'Bearer',
              scope: 'openid email profile',
              id_token: idTokenFor({ ...defaultClaims(), ...claims }),
            }
          : { error: 'invalid_grant', error_description: 'Bad Request' };
      setTimeout(() => {
        if (response.destroyed) return;
        response.writeHead(status, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify(body));
      }, delayMs);
    });
  });
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const { port } = server.address() as AddressInfo;
  const url = `http://127.0.0.1:${port}`;

  return {
    authUrl: `${url}/o/oauth2/v2/auth`,
    tokenUrl: `${url}/token`,
    requests,
    defaultClaims,
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
