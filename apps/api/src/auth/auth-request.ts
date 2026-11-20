import type { SessionUser } from '@amigo-secreto/shared';
import type { Session } from './session.entity.js';

// Só o que a API usa da requisição do Express; o SessionGuard preenche auth.
export type AuthRequest = {
  method: string;
  headers: { cookie?: string; 'x-csrf-token'?: string };
  auth?: { session: Session; user: SessionUser };
};
