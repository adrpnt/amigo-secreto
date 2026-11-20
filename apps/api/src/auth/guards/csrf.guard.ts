import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvironmentVariables } from '../../config/env.validation.js';
import type { AuthRequest } from '../auth-request.js';
import { parseCookies } from '../cookies.js';
import { CSRF_COOKIE, CSRF_HEADER, isValidCsrfToken } from '../csrf-token.js';

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// Global, depois do SessionGuard: double-submit assinado. O cabeçalho tem de
// repetir o cookie csrf, e o token tem de ter sido emitido para a sessão atual.
@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    if (!UNSAFE_METHODS.has(request.method)) return true;

    const cookie = parseCookies(request.headers.cookie).get(CSRF_COOKIE);
    const header = request.headers[CSRF_HEADER];
    const isValid =
      !!cookie &&
      header === cookie &&
      isValidCsrfToken(
        this.config.get('AUTH_SECRET', { infer: true }),
        header,
        request.auth?.session.id ?? null,
      );
    if (!isValid) {
      throw new ForbiddenException({
        statusCode: 403,
        message: 'Recarregue a página e tente de novo.',
        error: 'Forbidden',
      });
    }
    return true;
  }
}
