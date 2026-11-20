import type { SessionResponse } from '@amigo-secreto/shared';
import { Controller, Get, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvironmentVariables } from '../config/env.validation.js';
import type { AuthRequest } from './auth-request.js';
import { type CookieResponse, parseCookies } from './cookies.js';
import { CSRF_COOKIE, isValidCsrfToken } from './csrf-token.js';
import { Public } from './decorators/public.decorator.js';
import { SessionsService } from './sessions.service.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly config: ConfigService<EnvironmentVariables, true>,
    private readonly sessions: SessionsService,
  ) {}

  @Public()
  @Get('session')
  session(
    @Req() request: AuthRequest,
    @Res({ passthrough: true }) response: CookieResponse,
  ): SessionResponse {
    // Garante o cookie csrf: mantém o que já vale para a sessão atual.
    const sessionId = request.auth?.session.id ?? null;
    const csrf = parseCookies(request.headers.cookie).get(CSRF_COOKIE);
    const hasValidCsrf =
      !!csrf &&
      isValidCsrfToken(
        this.config.get('AUTH_SECRET', { infer: true }),
        csrf,
        sessionId,
      );
    if (!hasValidCsrf) this.sessions.issueCsrf(response, sessionId);

    return {
      user: request.auth?.user ?? null,
      googleEnabled: Boolean(
        this.config.get('GOOGLE_CLIENT_ID', { infer: true }) &&
        this.config.get('GOOGLE_CLIENT_SECRET', { infer: true }),
      ),
    };
  }
}
