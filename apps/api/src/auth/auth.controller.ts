import type { SessionResponse, SessionUser } from '@amigo-secreto/shared';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Ip,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvironmentVariables } from '../config/env.validation.js';
import type { AuthRequest } from './auth-request.js';
import { AuthService } from './auth.service.js';
import { type CookieResponse, parseCookies } from './cookies.js';
import { CSRF_COOKIE, isValidCsrfToken } from './csrf-token.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import { Public } from './decorators/public.decorator.js';
import { RegisterDto } from './dto/register.dto.js';
import { VerifyEmailDto } from './dto/verify-email.dto.js';
import { EmailVerificationService } from './email-verification.service.js';
import { SessionsService } from './sessions.service.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly config: ConfigService<EnvironmentVariables, true>,
    private readonly sessions: SessionsService,
    private readonly auth: AuthService,
    private readonly emailVerification: EmailVerificationService,
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
  @Public()
  @Post('register')
  @HttpCode(202)
  register(
    @Body() body: RegisterDto,
    @Ip() ip: string,
  ): Promise<{ email: string }> {
    return this.auth.register(body, ip);
  }
  @Public()
  @Post('email/verify')
  @HttpCode(200)
  verifyEmail(
    @Body() body: VerifyEmailDto,
    @Req() request: AuthRequest,
    @Res({ passthrough: true }) response: CookieResponse,
  ): Promise<{ next: string }> {
    return this.emailVerification.verify(
      body.token,
      response,
      request.auth?.session.id,
    );
  }

  @Post('email/verification-link')
  @HttpCode(202)
  sendVerificationLink(
    @CurrentUser() user: SessionUser,
    @Ip() ip: string,
  ): Promise<{ email: string }> {
    return this.emailVerification.sendVerificationLink(user, ip);
  }
}
