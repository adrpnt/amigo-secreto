import { TERMS_VERSION } from '@amigo-secreto/shared';
import { Injectable } from '@nestjs/common';
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
import { accountExistsEmail, emailVerificationEmail } from './auth-emails.js';
import { AuthTokensService } from './auth-tokens.service.js';
import type { RegisterDto } from './dto/register.dto.js';
import { PasswordHasher } from './password-hasher.js';
import { safeNext } from './safe-next.js';

const HOUR_MS = 60 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly config: ConfigService<EnvironmentVariables, true>,
    private readonly passwords: PasswordHasher,
    private readonly tokens: AuthTokensService,
    private readonly emails: EmailService,
    private readonly rateLimit: RateLimitService,
    private readonly events: BusinessEventsService,
  ) {}

  // A resposta é a mesma com e sem conta para o e-mail: quem já tem conta
  // recebe o aviso por e-mail, e nada na resposta diz qual dos dois aconteceu.
  async register(dto: RegisterDto, ip: string): Promise<{ email: string }> {
    const { email } = dto;
    await this.rateLimit.assertWithinLimits([
      {
        key: rateLimitKey('register', 'email', email),
        limit: 5,
        windowMs: HOUR_MS,
      },
      { key: rateLimitKey('register', 'ip', ip), limit: 20, windowMs: HOUR_MS },
    ]);
    const passwordHash = await this.passwords.hash(dto.password);
    const webUrl: string = this.config.get('WEB_URL', { infer: true });

    const createdId = await this.dataSource.transaction(async (manager) => {
      const now = new Date();
      // O índice único de email decide a corrida entre dois cadastros.
      const result = await manager
        .createQueryBuilder()
        .insert()
        .into(User)
        .values({
          name: dto.name,
          email,
          passwordHash,
          termsVersion: TERMS_VERSION,
          termsAcceptedAt: now,
          marketingOptIn: dto.marketingOptIn ?? false,
          marketingOptInAt: dto.marketingOptIn ? now : null,
        })
        .orIgnore()
        .returning(['id'])
        .execute();
      const [created] = result.raw as { id: string }[];

      if (!created) {
        // Se a conta foi apagada nesse meio-tempo, não há a quem avisar.
        const existing = await manager.findOneBy(User, { email });
        if (existing) {
          await this.emails.enqueue(
            accountExistsEmail({ to: email, name: existing.name, webUrl }),
            { manager },
          );
        }
        return null;
      }

      const token = await this.tokens.issue(
        created.id,
        'email_verification',
        { next: safeNext(dto.next) },
        manager,
      );
      await this.emails.enqueue(
        emailVerificationEmail({ to: email, name: dto.name, token, webUrl }),
        { manager },
      );
      return created.id;
    });

    if (createdId) {
      this.events.record('user.registered', {
        method: 'password',
        userId: createdId,
      });
    }
    return { email };
  }
}
