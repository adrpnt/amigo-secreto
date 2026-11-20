import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvironmentVariables } from '../../config/env.validation.js';

const EXCHANGE_TIMEOUT_MS = 10_000;
const SCOPE = 'openid email profile';
const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];

export const GOOGLE_CALLBACK_PATH = '/api/auth/google/callback';

export type GoogleProfile = {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
  picture: string | null;
};

// Toda falha do login com Google vira esta exceção; a mensagem diz o motivo
// e nunca leva o code nem o token.
export class GoogleOidcError extends Error {
  override name = 'GoogleOidcError';
}

type IdTokenClaims = {
  iss?: unknown;
  aud?: unknown;
  exp?: unknown;
  sub?: unknown;
  email?: unknown;
  email_verified?: unknown;
  name?: unknown;
  picture?: unknown;
};

function optionalString(value: unknown): string | null {
  return typeof value === 'string' && value !== '' ? value : null;
}

function decodeIdToken(idToken: string): IdTokenClaims {
  const parts = idToken.split('.');
  if (parts.length !== 3) {
    throw new GoogleOidcError('id_token malformado');
  }
  try {
    return JSON.parse(
      Buffer.from(parts[1], 'base64url').toString('utf8'),
    ) as IdTokenClaims;
  } catch {
    throw new GoogleOidcError('id_token malformado');
  }
}

@Injectable()
export class GoogleOidcClient {
  constructor(
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  authorizationUrl(params: { state: string; codeChallenge: string }): string {
    const url = new URL(this.config.get('GOOGLE_AUTH_URL', { infer: true }));
    url.search = new URLSearchParams({
      client_id: this.credentials().clientId,
      redirect_uri: this.redirectUri(),
      response_type: 'code',
      scope: SCOPE,
      state: params.state,
      code_challenge: params.codeChallenge,
      code_challenge_method: 'S256',
    }).toString();
    return url.toString();
  }

  // O id_token chega direto do endpoint de token, por HTTPS e com o client
  // secret; por isso a assinatura não é conferida, só aud, iss e exp.
  async exchange(code: string, codeVerifier: string): Promise<GoogleProfile> {
    const { clientId, clientSecret } = this.credentials();
    const response = await this.post({
      grant_type: 'authorization_code',
      code,
      code_verifier: codeVerifier,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: this.redirectUri(),
    });
    if (!response.ok) {
      await response.body?.cancel();
      throw new GoogleOidcError(`Google ${response.status}`);
    }

    let body: { id_token?: unknown };
    try {
      body = (await response.json()) as { id_token?: unknown };
    } catch {
      throw new GoogleOidcError('Resposta sem id_token');
    }
    if (typeof body.id_token !== 'string') {
      throw new GoogleOidcError('Resposta sem id_token');
    }

    const claims = decodeIdToken(body.id_token);
    if (claims.aud !== clientId) {
      throw new GoogleOidcError('aud inválido');
    }
    if (
      typeof claims.iss !== 'string' ||
      !GOOGLE_ISSUERS.includes(claims.iss)
    ) {
      throw new GoogleOidcError('iss inválido');
    }
    if (typeof claims.exp !== 'number' || claims.exp * 1000 <= Date.now()) {
      throw new GoogleOidcError('id_token vencido');
    }
    const sub = optionalString(claims.sub);
    const email = optionalString(claims.email);
    if (sub === null || email === null) {
      throw new GoogleOidcError('id_token sem sub ou e-mail');
    }

    return {
      sub,
      email,
      emailVerified: claims.email_verified === true,
      name: optionalString(claims.name),
      picture: optionalString(claims.picture),
    };
  }

  private credentials(): { clientId: string; clientSecret: string } {
    const clientId = this.config.get('GOOGLE_CLIENT_ID', { infer: true });
    const clientSecret = this.config.get('GOOGLE_CLIENT_SECRET', {
      infer: true,
    });
    if (!clientId || !clientSecret) {
      throw new GoogleOidcError('Google não configurado');
    }
    return { clientId, clientSecret };
  }

  private redirectUri(): string {
    const webUrl: string = this.config.get('WEB_URL', { infer: true });
    return new URL(GOOGLE_CALLBACK_PATH, webUrl).toString();
  }

  private async post(form: Record<string, string>): Promise<Response> {
    try {
      return await fetch(this.config.get('GOOGLE_TOKEN_URL', { infer: true }), {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(form).toString(),
        signal: AbortSignal.timeout(EXCHANGE_TIMEOUT_MS),
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        throw new GoogleOidcError('Tempo esgotado');
      }
      throw new GoogleOidcError('Falha de rede');
    }
  }
}
