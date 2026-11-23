import type { SessionUser } from '@amigo-secreto/shared';
import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AuthRequest } from '../auth-request.js';

// Usuário da sessão; em rota @Public() falta quando não há sessão.
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): SessionUser | undefined =>
    context.switchToHttp().getRequest<AuthRequest>().auth?.user,
);
