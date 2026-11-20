import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { passwordChangedEmail } from '../auth/auth-emails.js';
import { PasswordHasher } from '../auth/password-hasher.js';
import { SessionsService } from '../auth/sessions.service.js';
import { EmailService } from '../email/email.service.js';
import {
  RateLimitService,
  rateLimitKey,
} from '../rate-limit/rate-limit.service.js';
import type { ChangePasswordDto } from './dto/change-password.dto.js';
import { User } from './user.entity.js';

const WINDOW_MS = 15 * 60 * 1000;

const WRONG_PASSWORD = {
  statusCode: 400,
  message: 'Senha atual incorreta.',
  error: 'Bad Request',
};

@Injectable()
export class PasswordChangeService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly passwords: PasswordHasher,
    private readonly sessions: SessionsService,
    private readonly emails: EmailService,
    private readonly rateLimit: RateLimitService,
  ) {}

  // Troca (ou cria, na conta só Google) a senha, mantém a sessão atual e
  // encerra as outras. Links de recuperação pendentes continuam valendo.
  async change(
    userId: string,
    currentSessionId: string,
    dto: ChangePasswordDto,
  ): Promise<User> {
    await this.rateLimit.assertWithinLimits([
      {
        key: rateLimitKey('password-change', 'user', userId),
        limit: 10,
        windowMs: WINDOW_MS,
      },
    ]);
    const user = await this.dataSource
      .getRepository(User)
      .findOneByOrFail({ id: userId });
    if (user.passwordHash !== null) {
      const isValid =
        dto.currentPassword !== undefined &&
        (await this.passwords.verify(dto.currentPassword, user.passwordHash));
      if (!isValid) throw new BadRequestException(WRONG_PASSWORD);
    }
    const passwordHash = await this.passwords.hash(dto.newPassword);

    return this.dataSource.transaction(async (manager) => {
      await manager.update(User, user.id, { passwordHash });
      await this.sessions.revokeAll(
        user.id,
        { except: currentSessionId },
        manager,
      );
      await this.emails.enqueue(
        passwordChangedEmail({ to: user.email, name: user.name }),
        { manager },
      );
      return manager.findOneByOrFail(User, { id: user.id });
    });
  }
}
