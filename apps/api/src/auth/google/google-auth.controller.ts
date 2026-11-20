import { Controller, Get, Query, Redirect, Req, Res } from '@nestjs/common';
import type { AuthRequest } from '../auth-request.js';
import { type CookieResponse, parseCookies } from '../cookies.js';
import { Public } from '../decorators/public.decorator.js';
import {
  GOOGLE_OAUTH_COOKIE,
  GoogleAuthService,
} from './google-auth.service.js';

type RedirectTo = { url: string };

@Controller('auth/google')
export class GoogleAuthController {
  constructor(private readonly googleAuth: GoogleAuthService) {}

  @Public()
  @Get('start')
  @Redirect()
  start(
    @Query('next') next: string | undefined,
    @Res({ passthrough: true }) response: CookieResponse,
  ): RedirectTo {
    return { url: this.googleAuth.start(next, response) };
  }

  // GET sem token CSRF: o state do cookie g_oauth protege o retorno.
  @Public()
  @Get('callback')
  @Redirect()
  async callback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Req() request: AuthRequest,
    @Res({ passthrough: true }) response: CookieResponse,
  ): Promise<RedirectTo> {
    const url = await this.googleAuth.callback(
      { code, state, error },
      parseCookies(request.headers.cookie).get(GOOGLE_OAUTH_COOKIE),
      response,
      request.auth?.session.id,
    );
    return { url };
  }
}
