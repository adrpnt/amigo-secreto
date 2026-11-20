import type { SessionUser } from '@amigo-secreto/shared';
import type { Session } from './session.entity.js';

// Só o que a API usa da requisição do Express; o SessionGuard preenche auth.
export type AuthRequest = {
  headers: { cookie?: string };
  auth?: { session: Session; user: SessionUser };
};
