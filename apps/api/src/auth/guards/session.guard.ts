import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthRequest } from '../auth-request.js';
import { type CookieResponse, parseCookies } from '../cookies.js';
import { IS_PUBLIC } from '../decorators/public.decorator.js';
import { toSessionUser } from '../session-user.js';
import { SESSION_COOKIE, SessionsService } from '../sessions.service.js';

// Global: lê a sessão de toda requisição e recusa com 401 a rota sem
// @Public() quando não há sessão válida.
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessions: SessionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp();
    const request = http.getRequest<AuthRequest>();
    const token = parseCookies(request.headers.cookie).get(SESSION_COOKIE);
    const resolved = token ? await this.sessions.resolve(token) : null;

    if (resolved && token) {
      await this.sessions.touch(
        resolved.session,
        http.getResponse<CookieResponse>(),
        token,
      );
      request.auth = {
        session: resolved.session,
        user: toSessionUser(resolved.user),
      };
    }

    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(
      IS_PUBLIC,
      [context.getHandler(), context.getClass()],
    );
    if (!isPublic && !request.auth) {
      throw new UnauthorizedException({
        statusCode: 401,
        message: 'Entre para continuar.',
        error: 'Unauthorized',
      });
    }
    return true;
  }
}
