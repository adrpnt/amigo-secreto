import {
  BadRequestException,
  ConflictException,
  GoneException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, Not, QueryFailedError } from 'typeorm';
import {
  emailChangeNoticeEmail,
  newEmailConfirmationEmail,
} from '../auth/auth-emails.js';
import { AuthTokensService } from '../auth/auth-tokens.service.js';
import { LINK_GONE } from '../auth/email-verification.service.js';
import { PasswordHasher } from '../auth/password-hasher.js';
import type { EnvironmentVariables } from '../config/env.validation.js';
import { EmailService } from '../email/email.service.js';
import {
  RateLimitService,
  rateLimitKey,
} from '../rate-limit/rate-limit.service.js';
import type { ChangeEmailDto } from './dto/change-email.dto.js';
import { User } from './user.entity.js';

const HOUR_MS = 60 * 60 * 1000;

const badRequest = (message: string) =>
  new BadRequestException({ statusCode: 400, message, error: 'Bad Request' });

const EMAIL_IN_USE = {
  statusCode: 409,
  message: 'Este e-mail já está em uso por outra conta.',
  error: 'Conflict',
};

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof QueryFailedError &&
    (error.driverError as { code?: string }).code === '23505'
  );
}

@Injectable()
export class EmailChangeService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly config: ConfigService<EnvironmentVariables, true>,
    private readonly passwords: PasswordHasher,
    private readonly tokens: AuthTokensService,
    private readonly emails: EmailService,
    private readonly rateLimit: RateLimitService,
  ) {}

  // O e-mail atual vale até o link do novo ser aberto. Um e-mail novo que já
  // tem conta recebe o link do mesmo jeito: só quem o controla fica sabendo.
  async request(
    userId: string,
    dto: ChangeEmailDto,
  ): Promise<{ email: string }> {
    await this.rateLimit.assertWithinLimits([
      {
        key: rateLimitKey('email-change', 'user', userId),
        limit: 5,
        windowMs: HOUR_MS,
      },
    ]);
    const user = await this.dataSource
      .getRepository(User)
      .findOneByOrFail({ id: userId });
    if (user.passwordHash === null) {
      throw badRequest('Crie uma senha antes de trocar o e-mail.');
    }
    const isValid =
      dto.password !== undefined &&
      (await this.passwords.verify(dto.password, user.passwordHash));
    if (!isValid) throw badRequest('Senha atual incorreta.');
    if (dto.newEmail === user.email) {
      throw badRequest('Este já é o seu e-mail.');
    }
    const webUrl: string = this.config.get('WEB_URL', { infer: true });

    await this.dataSource.transaction(async (manager) => {
      const token = await this.tokens.issue(
        user.id,
        'email_change',
        { newEmail: dto.newEmail },
        manager,
      );
      await this.emails.enqueue(
        newEmailConfirmationEmail({
          to: dto.newEmail,
          name: user.name,
          token,
          webUrl,
        }),
        { manager },
      );
      await this.emails.enqueue(
        emailChangeNoticeEmail({
          to: user.email,
          name: user.name,
          newEmail: dto.newEmail,
        }),
        { manager },
      );
    });
    return { email: dto.newEmail };
  }

  // Troca o e-mail pelo novo, já confirmado. No 409 a transação volta e o
  // link continua sem uso.
  async confirm(rawToken: string): Promise<{ email: string }> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const token = await this.tokens.consume(
          rawToken,
          'email_change',
          manager,
        );
        if (!token?.newEmail) throw new GoneException(LINK_GONE);
        const taken = await manager.existsBy(User, {
          email: token.newEmail,
          id: Not(token.userId),
        });
        if (taken) throw new ConflictException(EMAIL_IN_USE);
        await manager.update(User, token.userId, {
          email: token.newEmail,
          emailVerifiedAt: new Date(),
        });
        return { email: token.newEmail };
      });
    } catch (error) {
      // Outra conta ficou com o e-mail entre a consulta e a gravação.
      if (isUniqueViolation(error)) throw new ConflictException(EMAIL_IN_USE);
      throw error;
    }
  }
}
