import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  Redirect,
  Req,
  Res,
} from '@nestjs/common';
import type { AuthRequest } from '../auth-request.js';
import { type CookieResponse, parseCookies } from '../cookies.js';
import { Public } from '../decorators/public.decorator.js';
import { GoogleCompleteDto } from '../dto/google-complete.dto.js';
import {
  GOOGLE_OAUTH_COOKIE,
  GOOGLE_SIGNUP_COOKIE,
  GoogleAuthService,
} from './google-auth.service.js';
import { GoogleSignupService } from './google-signup.service.js';

type RedirectTo = { url: string };

@Controller('auth/google')
export class GoogleAuthController {
  constructor(
    private readonly googleAuth: GoogleAuthService,
    private readonly googleSignup: GoogleSignupService,
  ) {}

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

  @Public()
  @Get('signup')
  signup(@Req() request: AuthRequest): { name: string; email: string } {
    return this.googleSignup.pending(
      parseCookies(request.headers.cookie).get(GOOGLE_SIGNUP_COOKIE),
    );
  }

  @Public()
  @Post('complete')
  @HttpCode(200)
  complete(
    @Body() body: GoogleCompleteDto,
    @Req() request: AuthRequest,
    @Res({ passthrough: true }) response: CookieResponse,
  ): Promise<{ next: string }> {
    return this.googleSignup.complete(
      body,
      parseCookies(request.headers.cookie).get(GOOGLE_SIGNUP_COOKIE),
      response,
      request.auth?.session.id,
    );
  }
}
