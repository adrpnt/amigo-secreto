import type { SessionUser } from '@amigo-secreto/shared';
import type { User } from '../users/user.entity.js';

export function toSessionUser(user: User): SessionUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
    emailVerified: user.emailVerifiedAt !== null,
    hasPassword: user.passwordHash !== null,
    hasGoogle: user.googleId !== null,
    marketingOptIn: user.marketingOptIn,
  };
}
