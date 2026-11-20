import { ConfigService } from '@nestjs/config';
import {
  GoogleOidcClient,
  GoogleOidcError,
} from '../src/auth/google/google-oidc.client.js';
import type { EnvironmentVariables } from '../src/config/env.validation.js';
import { startFakeGoogle, type FakeGoogle } from './fake-google.js';

const CLIENT_ID = 'cliente-google-teste';
const CLIENT_SECRET = 'segredo-google-teste';
const WEB_URL = 'https://amigo-secreto.example.com';

describe('GoogleOidcClient', () => {
  let google: FakeGoogle;
  let client: GoogleOidcClient;

  beforeAll(async () => {
    google = await startFakeGoogle(CLIENT_ID);
    client = new GoogleOidcClient(
      new ConfigService<EnvironmentVariables, true>({
        WEB_URL,
        GOOGLE_CLIENT_ID: CLIENT_ID,
        GOOGLE_CLIENT_SECRET: CLIENT_SECRET,
        GOOGLE_AUTH_URL: google.authUrl,
        GOOGLE_TOKEN_URL: google.tokenUrl,
      }),
    );
  });

  afterAll(async () => {
    await google.close();
  });

  beforeEach(() => {
    google.reset();
  });

  async function exchangeError(): Promise<Error> {
    const error: unknown = await client
      .exchange('code-1', 'verifier-1')
      .catch((e: unknown) => e);
    if (!(error instanceof Error)) {
      throw new Error('A troca deveria ter falhado');
    }
    return error;
  }

  it('monta a URL de autorização com client_id, redirect_uri, scope openid email profile, state e code_challenge S256', () => {
    const url = new URL(
      client.authorizationUrl({
        state: 'state-1',
        codeChallenge: 'challenge-1',
      }),
    );

    expect(`${url.origin}${url.pathname}`).toBe(google.authUrl);
    expect(Object.fromEntries(url.searchParams)).toEqual({
      client_id: CLIENT_ID,
      redirect_uri: `${WEB_URL}/api/auth/google/callback`,
      response_type: 'code',
      scope: 'openid email profile',
      state: 'state-1',
      code_challenge: 'challenge-1',
      code_challenge_method: 'S256',
    });
  });

  it('troca o code com code_verifier e client secret e devolve sub, e-mail, email_verified, nome e foto', async () => {
    google.replyWith({
      claims: {
        sub: 'google-sub-42',
        email: 'bia@example.com',
        email_verified: false,
        name: 'Bia Lima',
        picture: 'https://lh3.googleusercontent.com/a/bia',
      },
    });

    const profile = await client.exchange('code-1', 'verifier-1');

    expect(google.requests).toEqual([
      {
        grant_type: 'authorization_code',
        code: 'code-1',
        code_verifier: 'verifier-1',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: `${WEB_URL}/api/auth/google/callback`,
      },
    ]);
    expect(profile).toEqual({
      sub: 'google-sub-42',
      email: 'bia@example.com',
      emailVerified: false,
      name: 'Bia Lima',
      picture: 'https://lh3.googleusercontent.com/a/bia',
    });
  });

  it('recusa id_token com aud de outro cliente', async () => {
    google.replyWith({ claims: { aud: 'outro-cliente' } });

    const error = await exchangeError();

    expect(error).toBeInstanceOf(GoogleOidcError);
    expect(error.message).toBe('aud inválido');
  });

  it('recusa id_token com iss fora do Google', async () => {
    google.replyWith({ claims: { iss: 'https://accounts.example.com' } });

    const error = await exchangeError();

    expect(error).toBeInstanceOf(GoogleOidcError);
    expect(error.message).toBe('iss inválido');
  });

  it('recusa id_token vencido', async () => {
    google.replyWith({
      claims: { exp: Math.floor(Date.now() / 1000) - 1 },
    });

    const error = await exchangeError();

    expect(error).toBeInstanceOf(GoogleOidcError);
    expect(error.message).toBe('id_token vencido');
  });

  it('falha em 10 segundos quando o Google não responde', async () => {
    google.replyWith({ delayMs: 10_500 });
    const startedAt = Date.now();

    const error = await exchangeError();

    const elapsed = Date.now() - startedAt;
    expect(error).toBeInstanceOf(GoogleOidcError);
    expect(error.message).toBe('Tempo esgotado');
    expect(elapsed).toBeGreaterThanOrEqual(10_000);
    expect(elapsed).toBeLessThan(10_500);
  }, 15_000);
});
