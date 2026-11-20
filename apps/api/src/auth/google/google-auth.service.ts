import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'node:crypto';
import { DataSource } from 'typeorm';
import type { EnvironmentVariables } from '../../config/env.validation.js';
import { EmailService } from '../../email/email.service.js';
import { BusinessEventsService } from '../../observability/business-events.service.js';
import { User } from '../../users/user.entity.js';
import { googleLinkedEmail } from '../auth-emails.js';
import type { CookieOptions, CookieResponse } from '../cookies.js';
import { safeNext } from '../safe-next.js';
import { SessionsService } from '../sessions.service.js';
import {
  GoogleOidcClient,
  GoogleOidcError,
  type GoogleProfile,
} from './google-oidc.client.js';
import { readSignedCookie, signCookie } from './signed-cookie.js';

export const GOOGLE_OAUTH_COOKIE = 'g_oauth';
export const GOOGLE_SIGNUP_COOKIE = 'g_signup';

const OAUTH_TTL_MS = 10 * 60 * 1000;
const SIGNUP_TTL_MS = 15 * 60 * 1000;
const RANDOM_BYTES = 32;
const SIGNUP_PATH = '/completar-cadastro';

type OAuthState = { state: string; verifier: string; next: string };

export type GoogleSignup = {
  sub: string;
  email: string;
  name: string | null;
  picture: string | null;
  next: string;
};

export type GoogleCallbackQuery = {
  code?: string;
  state?: string;
  error?: string;
};

type GoogleError = 'google' | 'google_nao_verificado';

// Resultado da conta no retorno: entra, vai completar o cadastro ou é recusada.
type AccountOutcome =
  | { kind: 'session'; userId: string; verifiedNow: boolean }
  | { kind: 'signup' }
  | { kind: 'error'; error: GoogleError };

function randomToken(): string {
  return randomBytes(RANDOM_BYTES).toString('base64url');
}

function errorUrl(error: GoogleError, next?: string): string {
  const params = new URLSearchParams({ erro: error });
  if (next) params.set('next', next);
  return `/entrar?${params.toString()}`;
}

@Injectable()
export class GoogleAuthService {
  constructor(
    private readonly config: ConfigService<EnvironmentVariables, true>,
    private readonly dataSource: DataSource,
    private readonly google: GoogleOidcClient,
    private readonly sessions: SessionsService,
    private readonly emails: EmailService,
    private readonly events: BusinessEventsService,
  ) {}

  isEnabled(): boolean {
    return Boolean(
      this.config.get('GOOGLE_CLIENT_ID', { infer: true }) &&
      this.config.get('GOOGLE_CLIENT_SECRET', { infer: true }),
    );
  }

  // Grava state, verifier e destino no cookie g_oauth e devolve a URL do Google.
  start(next: string | undefined, response: CookieResponse): string {
    if (!this.isEnabled()) throw new NotFoundException();
    const oauth: OAuthState = {
      state: randomToken(),
      verifier: randomToken(),
      next: safeNext(next),
    };
    response.cookie(
      GOOGLE_OAUTH_COOKIE,
      signCookie(this.secret(), oauth, OAUTH_TTL_MS),
      this.cookieOptions('/api/auth/google', OAUTH_TTL_MS),
    );
    return this.google.authorizationUrl({
      state: oauth.state,
      codeChallenge: createHash('sha256')
        .update(oauth.verifier)
        .digest('base64url'),
    });
  }

  // Devolve o caminho do site para onde o navegador segue.
  async callback(
    query: GoogleCallbackQuery,
    oauthCookie: string | undefined,
    response: CookieResponse,
    currentSessionId: string | undefined,
  ): Promise<string> {
    response.clearCookie(
      GOOGLE_OAUTH_COOKIE,
      this.cookieOptions('/api/auth/google'),
    );
    const oauth = readSignedCookie<OAuthState>(this.secret(), oauthCookie);
    if (!oauth) return errorUrl('google');
    const { next } = oauth;
    if (query.error || !query.code || query.state !== oauth.state) {
      return errorUrl('google', next);
    }

    let profile: GoogleProfile;
    try {
      profile = await this.google.exchange(query.code, oauth.verifier);
    } catch (error) {
      if (error instanceof GoogleOidcError) return errorUrl('google', next);
      throw error;
    }
    if (!profile.emailVerified) return errorUrl('google_nao_verificado', next);

    const email = profile.email.trim().toLowerCase();
    const outcome = await this.resolveAccount(profile, email);
    if (outcome.kind === 'error') return errorUrl(outcome.error, next);
    if (outcome.kind === 'signup') {
      const signup: GoogleSignup = {
        sub: profile.sub,
        email,
        name: profile.name,
        picture: profile.picture,
        next,
      };
      response.cookie(
        GOOGLE_SIGNUP_COOKIE,
        signCookie(this.secret(), signup, SIGNUP_TTL_MS),
        this.cookieOptions('/', SIGNUP_TTL_MS),
      );
      return SIGNUP_PATH;
    }

    if (outcome.verifiedNow) {
      this.events.record('user.email_verified', { userId: outcome.userId });
    }
    if (currentSessionId) await this.sessions.revoke(currentSessionId);
    await this.sessions.create(outcome.userId, response);
    return next;
  }

  // Conta vinculada entra com a foto atual; conta com o mesmo e-mail e sem
  // Google é vinculada; vinculada a outro Google é recusada.
  private resolveAccount(
    profile: GoogleProfile,
    email: string,
  ): Promise<AccountOutcome> {
    return this.dataSource.transaction(async (manager) => {
      const linked = await manager.findOneBy(User, { googleId: profile.sub });
      if (linked) {
        await manager.update(User, linked.id, { avatarUrl: profile.picture });
        return { kind: 'session', userId: linked.id, verifiedNow: false };
      }

      const user = await manager.findOneBy(User, { email });
      if (!user) return { kind: 'signup' };
      if (user.googleId !== null) return { kind: 'error', error: 'google' };

      await manager.update(User, user.id, {
        googleId: profile.sub,
        avatarUrl: profile.picture,
        emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
      });
      await this.emails.enqueue(
        googleLinkedEmail({ to: user.email, name: user.name }),
        { manager },
      );
      return {
        kind: 'session',
        userId: user.id,
        verifiedNow: user.emailVerifiedAt === null,
      };
    });
  }

  private secret(): string {
    return this.config.get('AUTH_SECRET', { infer: true });
  }

  private cookieOptions(path: string, maxAge?: number): CookieOptions {
    return {
      httpOnly: true,
      secure: this.config.get('NODE_ENV', { infer: true }) === 'production',
      sameSite: 'lax',
      path,
      ...(maxAge === undefined ? {} : { maxAge }),
    };
  }
}
