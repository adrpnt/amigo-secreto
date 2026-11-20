import type { SessionUser } from '@amigo-secreto/shared';
import { ConflictException, GoneException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, IsNull } from 'typeorm';
import type { EnvironmentVariables } from '../config/env.validation.js';
import { EmailService } from '../email/email.service.js';
import { BusinessEventsService } from '../observability/business-events.service.js';
import {
  RateLimitService,
  rateLimitKey,
} from '../rate-limit/rate-limit.service.js';
import { User } from '../users/user.entity.js';
import { emailVerificationEmail } from './auth-emails.js';
import { AuthToken } from './auth-token.entity.js';
import { AuthTokensService } from './auth-tokens.service.js';
import type { CookieResponse } from './cookies.js';
import { DEFAULT_NEXT } from './safe-next.js';
import { SessionsService } from './sessions.service.js';

export const LINK_GONE = 'Este link expirou ou já foi usado.';

const HOUR_MS = 60 * 60 * 1000;

@Injectable()
export class EmailVerificationService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly config: ConfigService<EnvironmentVariables, true>,
    private readonly tokens: AuthTokensService,
    private readonly sessions: SessionsService,
    private readonly emails: EmailService,
    private readonly rateLimit: RateLimitService,
    private readonly events: BusinessEventsService,
  ) {}

  // Confirma o e-mail do dono do link e o deixa logado no navegador, no
  // lugar de qualquer sessão que ele já tivesse.
  async verify(
    rawToken: string,
    response: CookieResponse,
    currentSessionId: string | undefined,
  ): Promise<{ next: string }> {
    const { userId, next } = await this.dataSource.transaction(
      async (manager) => {
        const token = await this.tokens.consume(
          rawToken,
          'email_verification',
          manager,
        );
        if (!token) throw new GoneException(LINK_GONE);
        const user = await manager.findOneByOrFail(User, {
          id: token.userId,
        });
        // Confirmou por outro caminho (Google ou recuperação de senha).
        if (user.emailVerifiedAt) throw new GoneException(LINK_GONE);
        await manager.update(User, user.id, { emailVerifiedAt: new Date() });
        return { userId: user.id, next: token.next ?? DEFAULT_NEXT };
      },
    );

    this.events.record('user.email_verified', { userId });
    if (currentSessionId) await this.sessions.revoke(currentSessionId);
    await this.sessions.create(userId, response);
    return { next };
  }

  async sendVerificationLink(
    user: SessionUser,
    ip: string,
  ): Promise<{ email: string }> {
    if (user.emailVerified) {
      throw new ConflictException('Seu e-mail já está confirmado.');
    }
    await this.rateLimit.assertWithinLimits([
      {
        key: rateLimitKey('email-verification-link', 'email', user.email),
        limit: 5,
        windowMs: HOUR_MS,
      },
      {
        key: rateLimitKey('email-verification-link', 'ip', ip),
        limit: 20,
        windowMs: HOUR_MS,
      },
    ]);
    const webUrl = this.config.get('WEB_URL', { infer: true });

    await this.dataSource.transaction(async (manager) => {
      // O link novo leva aonde o pendente levaria.
      const pending = await manager.findOne(AuthToken, {
        where: {
          userId: user.id,
          type: 'email_verification',
          usedAt: IsNull(),
        },
        order: { createdAt: 'DESC' },
      });
      const token = await this.tokens.issue(
        user.id,
        'email_verification',
        { next: pending?.next ?? undefined },
        manager,
      );
      await this.emails.enqueue(
        emailVerificationEmail({
          to: user.email,
          name: user.name,
          token,
          webUrl,
        }),
        { manager },
      );
    });
    return { email: user.email };
  }
}
