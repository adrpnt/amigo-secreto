import { GoneException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import type { EnvironmentVariables } from '../config/env.validation.js';
import { EmailService } from '../email/email.service.js';
import { BusinessEventsService } from '../observability/business-events.service.js';
import {
  RateLimitService,
  rateLimitKey,
} from '../rate-limit/rate-limit.service.js';
import { User } from '../users/user.entity.js';
import { passwordChangedEmail, passwordResetEmail } from './auth-emails.js';
import { AuthTokensService } from './auth-tokens.service.js';
import type { CookieResponse } from './cookies.js';
import type { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import type { ResetPasswordDto } from './dto/reset-password.dto.js';
import { LINK_GONE } from './email-verification.service.js';
import { PasswordHasher } from './password-hasher.js';
import { DEFAULT_NEXT, safeNext } from './safe-next.js';
import { SessionsService } from './sessions.service.js';

const HOUR_MS = 60 * 60 * 1000;

@Injectable()
export class PasswordResetService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly config: ConfigService<EnvironmentVariables, true>,
    private readonly passwords: PasswordHasher,
    private readonly tokens: AuthTokensService,
    private readonly sessions: SessionsService,
    private readonly emails: EmailService,
    private readonly rateLimit: RateLimitService,
    private readonly events: BusinessEventsService,
  ) {}

  // A resposta é a mesma com e sem conta; só quem tem conta recebe e-mail.
  async forgot(dto: ForgotPasswordDto, ip: string): Promise<{ email: string }> {
    const { email } = dto;
    await this.rateLimit.assertWithinLimits([
      {
        key: rateLimitKey('password-forgot', 'email', email),
        limit: 5,
        windowMs: HOUR_MS,
      },
      {
        key: rateLimitKey('password-forgot', 'ip', ip),
        limit: 20,
        windowMs: HOUR_MS,
      },
    ]);
    const webUrl: string = this.config.get('WEB_URL', { infer: true });

    await this.dataSource.transaction(async (manager) => {
      const user = await manager.findOneBy(User, { email });
      if (!user) return;
      const token = await this.tokens.issue(
        user.id,
        'password_reset',
        { next: safeNext(dto.next) },
        manager,
      );
      await this.emails.enqueue(
        passwordResetEmail({ to: user.email, name: user.name, token, webUrl }),
        { manager },
      );
    });
    return { email };
  }

  // Troca a senha, confirma o e-mail (quem recebeu o link prova a posse) e
  // derruba todas as sessões da conta; o navegador sai com uma sessão nova.
  async reset(
    dto: ResetPasswordDto,
    response: CookieResponse,
    currentSessionId: string | undefined,
  ): Promise<{ next: string }> {
    const passwordHash = await this.passwords.hash(dto.password);

    const { userId, next, verifiedNow } = await this.dataSource.transaction(
      async (manager) => {
        const token = await this.tokens.consume(
          dto.token,
          'password_reset',
          manager,
        );
        if (!token) throw new GoneException(LINK_GONE);
        const user = await manager.findOneByOrFail(User, {
          id: token.userId,
        });
        await manager.update(User, user.id, {
          passwordHash,
          emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
        });
        await this.sessions.revokeAll(user.id, {}, manager);
        await this.emails.enqueue(
          passwordChangedEmail({ to: user.email, name: user.name }),
          { manager },
        );
        return {
          userId: user.id,
          next: token.next ?? DEFAULT_NEXT,
          verifiedNow: user.emailVerifiedAt === null,
        };
      },
    );

    if (verifiedNow) this.events.record('user.email_verified', { userId });
    // A sessão de outra conta que o navegador tivesse também sai.
    if (currentSessionId) await this.sessions.revoke(currentSessionId);
    await this.sessions.create(userId, response);
    return { next };
  }
}
