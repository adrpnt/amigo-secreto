import type { SessionUser } from '@amigo-secreto/shared';
import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AuthRequest } from '../auth-request.js';

// Usuário da sessão; só existe em rota que exige sessão.
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): SessionUser | undefined =>
    context.switchToHttp().getRequest<AuthRequest>().auth?.user,
);
