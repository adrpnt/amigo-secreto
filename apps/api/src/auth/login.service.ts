import type { SessionUser } from '@amigo-secreto/shared';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import {
  RateLimitService,
  rateLimitKey,
} from '../rate-limit/rate-limit.service.js';
import { User } from '../users/user.entity.js';
import type { CookieResponse } from './cookies.js';
import type { LoginDto } from './dto/login.dto.js';
import { PasswordHasher } from './password-hasher.js';
import { toSessionUser } from './session-user.js';
import { SESSION_COOKIE, SessionsService } from './sessions.service.js';

const WINDOW_MS = 15 * 60 * 1000;

@Injectable()
export class LoginService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly passwords: PasswordHasher,
    private readonly sessions: SessionsService,
    private readonly rateLimit: RateLimitService,
  ) {}

  // A mesma recusa para e-mail sem conta, senha errada e conta sem senha; a
  // senha é verificada contra um hash fixo quando não há hash guardado.
  async login(
    dto: LoginDto,
    ip: string,
    response: CookieResponse,
    currentSessionId: string | undefined,
  ): Promise<{ user: SessionUser }> {
    await this.rateLimit.assertWithinLimits([
      {
        key: rateLimitKey('login', 'email', dto.email),
        limit: 10,
        windowMs: WINDOW_MS,
      },
      { key: rateLimitKey('login', 'ip', ip), limit: 30, windowMs: WINDOW_MS },
    ]);
    const user = await this.users.findOneBy({ email: dto.email });
    const isValid = await this.passwords.verify(
      dto.password,
      user?.passwordHash ?? null,
    );
    if (!user || !isValid) {
      throw new UnauthorizedException({
        statusCode: 401,
        message: 'E-mail ou senha incorretos.',
        error: 'Unauthorized',
      });
    }
    if (currentSessionId) await this.sessions.revoke(currentSessionId);
    await this.sessions.create(user.id, response);
    return { user: toSessionUser(user) };
  }

  async logout(sessionId: string, response: CookieResponse): Promise<void> {
    await this.sessions.revoke(sessionId, response);
    response.clearCookie(SESSION_COOKIE, this.sessions.cookieOptions());
  }

  async logoutAll(userId: string, response: CookieResponse): Promise<void> {
    await this.sessions.revokeAll(userId);
    this.sessions.issueCsrf(response, null);
    response.clearCookie(SESSION_COOKIE, this.sessions.cookieOptions());
  }
}
