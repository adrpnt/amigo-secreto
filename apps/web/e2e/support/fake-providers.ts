// Servidor no lugar do Resend e do Google durante o e2e. Roda como
// webServer do Playwright: `node e2e/support/fake-providers.ts`.
import { randomUUID } from 'node:crypto';
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http';

export const FAKE_PROVIDERS_PORT = 3300;
export const FAKE_PROVIDERS_URL = `http://localhost:${FAKE_PROVIDERS_PORT}`;
export const FAKE_GOOGLE_NAME = 'Bia Google';

export type FakeEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

type GoogleIdentity = {
  sub: string;
  email: string;
  emailVerified: boolean;
};

// PNG de 1x1 pixel azul, para a foto do Google carregar sem internet.
const AVATAR_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

const emails: FakeEmail[] = [];
const identitiesByCode = new Map<string, GoogleIdentity>();

function readBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    request.on('data', (chunk: Buffer) => chunks.push(chunk));
    request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    request.on('error', reject);
  });
}

function sendJson(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify(body));
}

function redirect(response: ServerResponse, location: string) {
  response.writeHead(302, { Location: location });
  response.end();
}

const base64url = (value: unknown) =>
  Buffer.from(JSON.stringify(value)).toString('base64url');

// A API não confere a assinatura do id_token, só aud, iss e exp.
function idTokenFor(clientId: string, identity: GoogleIdentity): string {
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    iss: 'https://accounts.google.com',
    aud: clientId,
    sub: identity.sub,
    email: identity.email,
    email_verified: identity.emailVerified,
    name: FAKE_GOOGLE_NAME,
    picture: `${FAKE_PROVIDERS_URL}/avatar.png`,
    iat: now,
    exp: now + 3600,
  };
  return `${base64url({ alg: 'RS256', kid: 'google-falso' })}.${base64url(claims)}.assinatura-falsa`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function googleChooserPage(url: URL): string {
  const choose = (choice: string) => {
    const target = new URL('/o/oauth2/v2/auth/choose', FAKE_PROVIDERS_URL);
    target.searchParams.set('choice', choice);
    target.searchParams.set('state', url.searchParams.get('state') ?? '');
    target.searchParams.set(
      'redirect_uri',
      url.searchParams.get('redirect_uri') ?? '',
    );
    return escapeHtml(target.toString());
  };
  return `<!doctype html>
<html lang="pt-BR">
  <head><meta charset="utf-8"><title>Google falso</title></head>
  <body>
    <h1>Escolha uma conta</h1>
    <ul>
      <li><a href="${choose('verificada')}">Verificada nova</a></li>
      <li><a href="${choose('nao_verificada')}">Não verificada</a></li>
      <li><a href="${choose('cancelar')}">Cancelar</a></li>
    </ul>
  </body>
</html>`;
}

function chooseGoogleIdentity(url: URL, response: ServerResponse) {
  const callback = new URL(url.searchParams.get('redirect_uri') ?? '');
  callback.searchParams.set('state', url.searchParams.get('state') ?? '');
  const choice = url.searchParams.get('choice');

  if (choice === 'cancelar') {
    callback.searchParams.set('error', 'access_denied');
    redirect(response, callback.toString());
    return;
  }

  const id = randomUUID();
  const code = randomUUID();
  identitiesByCode.set(code, {
    sub: `google-${id}`,
    email: `google-${id}@example.com`,
    emailVerified: choice === 'verificada',
  });
  callback.searchParams.set('code', code);
  redirect(response, callback.toString());
}

async function exchangeGoogleCode(
  request: IncomingMessage,
  response: ServerResponse,
) {
  const form = new URLSearchParams(await readBody(request));
  const identity = identitiesByCode.get(form.get('code') ?? '');
  if (!identity) {
    sendJson(response, 400, {
      error: 'invalid_grant',
      error_description: 'Bad Request',
    });
    return;
  }
  identitiesByCode.delete(form.get('code') ?? '');
  sendJson(response, 200, {
    access_token: 'access-token-falso',
    expires_in: 3599,
    token_type: 'Bearer',
    scope: 'openid email profile',
    id_token: idTokenFor(form.get('client_id') ?? '', identity),
  });
}

async function receiveEmail(
  request: IncomingMessage,
  response: ServerResponse,
) {
  const body = JSON.parse(await readBody(request)) as {
    to: string[];
    subject: string;
    html: string;
    text: string;
  };
  for (const to of body.to) {
    emails.push({
      to,
      subject: body.subject,
      html: body.html,
      text: body.text,
    });
  }
  sendJson(response, 200, { id: randomUUID() });
}

function latestEmail(url: URL, response: ServerResponse) {
  const to = url.searchParams.get('to');
  const email = emails.findLast((candidate) => candidate.to === to);
  if (!email) {
    sendJson(response, 404, { message: `Nenhum e-mail para ${to}.` });
    return;
  }
  sendJson(response, 200, email);
}

const server = createServer((request, response) => {
  const url = new URL(request.url ?? '/', FAKE_PROVIDERS_URL);
  const route = `${request.method} ${url.pathname}`;

  const handle = async () => {
    switch (route) {
      case 'GET /health':
        return sendJson(response, 200, { status: 'ok' });
      case 'POST /emails':
        return receiveEmail(request, response);
      case 'GET /emails/latest':
        return latestEmail(url, response);
      case 'GET /o/oauth2/v2/auth':
        response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        return response.end(googleChooserPage(url));
      case 'GET /o/oauth2/v2/auth/choose':
        return chooseGoogleIdentity(url, response);
      case 'POST /token':
        return exchangeGoogleCode(request, response);
      case 'GET /avatar.png':
        response.writeHead(200, { 'Content-Type': 'image/png' });
        return response.end(AVATAR_PNG);
      default:
        return sendJson(response, 404, { message: `Sem rota ${route}.` });
    }
  };

  handle().catch((error: unknown) => {
    sendJson(response, 500, { message: String(error) });
  });
});

// Só sobe o servidor quando roda como processo; o fixture importa as
// constantes daqui sem abrir a porta.
if (import.meta.main) {
  server.listen(FAKE_PROVIDERS_PORT);
}
