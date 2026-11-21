import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { type EntityManager, IsNull } from 'typeorm';
import { AuthToken, type AuthTokenType } from './auth-token.entity.js';

const TOKEN_BYTES = 32;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const VALIDITY_MS: Record<AuthTokenType, number> = {
  email_verification: 7 * DAY_MS,
  password_reset: HOUR_MS,
  email_change: 7 * DAY_MS,
};

export type IssueAuthTokenOptions = { newEmail?: string; next?: string };

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// Recebe sempre o manager de quem chama: o token nasce e é consumido dentro
// da transação do fluxo que o usa.
@Injectable()
export class AuthTokensService {
  // Devolve o token bruto, que só existe no link do e-mail.
  async issue(
    userId: string,
    type: AuthTokenType,
    { newEmail, next }: IssueAuthTokenOptions,
    manager: EntityManager,
  ): Promise<string> {
    const tokens = manager.getRepository(AuthToken);
    await tokens.delete({ userId, type, usedAt: IsNull() });
    const token = randomBytes(TOKEN_BYTES).toString('base64url');
    await tokens.insert({
      userId,
      type,
      tokenHash: hashToken(token),
      newEmail: newEmail ?? null,
      next: next ?? null,
      expiresAt: new Date(Date.now() + VALIDITY_MS[type]),
    });
    return token;
  }

  // Nulo para token inexistente, de outro tipo, vencido ou já usado. A linha
  // fica travada até o fim da transação: um segundo consumo simultâneo espera
  // e encontra o token já usado.
  async consume(
    rawToken: string,
    type: AuthTokenType,
    manager: EntityManager,
  ): Promise<AuthToken | null> {
    const tokens = manager.getRepository(AuthToken);
    const token = await tokens.findOne({
      where: { tokenHash: hashToken(rawToken), type },
      lock: { mode: 'pessimistic_write' },
    });
    if (!token || token.usedAt || token.expiresAt.getTime() <= Date.now()) {
      return null;
    }
    token.usedAt = new Date();
    await tokens.update(token.id, { usedAt: token.usedAt });
    return token;
  }

  // Apaga os links ainda não usados da conta, de qualquer tipo.
  async revokePending(userId: string, manager: EntityManager): Promise<void> {
    await manager.getRepository(AuthToken).delete({ userId, usedAt: IsNull() });
  }
}
