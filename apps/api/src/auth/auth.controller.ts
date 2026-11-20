import type { SessionResponse } from '@amigo-secreto/shared';
import { Controller, Get, Req } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvironmentVariables } from '../config/env.validation.js';
import type { AuthRequest } from './auth-request.js';
import { Public } from './decorators/public.decorator.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  @Public()
  @Get('session')
  session(@Req() request: AuthRequest): SessionResponse {
    return {
      user: request.auth?.user ?? null,
      googleEnabled: Boolean(
        this.config.get('GOOGLE_CLIENT_ID', { infer: true }) &&
        this.config.get('GOOGLE_CLIENT_SECRET', { infer: true }),
      ),
    };
  }
}
