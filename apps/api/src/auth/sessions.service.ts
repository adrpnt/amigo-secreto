import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes } from 'node:crypto';
import {
  type EntityManager,
  MoreThan,
  Not,
  type FindOptionsWhere,
  Repository,
} from 'typeorm';
import type { EnvironmentVariables } from '../config/env.validation.js';
import type { User } from '../users/user.entity.js';
import type { CookieOptions, CookieResponse } from './cookies.js';
import { Session } from './session.entity.js';

export const SESSION_COOKIE = 'sid';

const TOKEN_BYTES = 32;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
// Grava o uso no máximo 1 vez por hora, para não fazer um UPDATE por requisição.
const TOUCH_INTERVAL_MS = 60 * 60 * 1000;

export type ResolvedSession = { session: Session; user: User };

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class SessionsService {
  constructor(
    @InjectRepository(Session) private readonly sessions: Repository<Session>,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  async create(
    userId: string,
    response: CookieResponse,
    manager?: EntityManager,
  ): Promise<Session> {
    const token = randomBytes(TOKEN_BYTES).toString('base64url');
    const now = new Date();
    const sessions = manager?.getRepository(Session) ?? this.sessions;
    const session = await sessions.save(
      sessions.create({
        userId,
        tokenHash: hashToken(token),
        lastUsedAt: now,
        expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
      }),
    );
    response.cookie(SESSION_COOKIE, token, this.cookieOptions());
    return session;
  }

  async resolve(rawToken: string | undefined): Promise<ResolvedSession | null> {
    if (!rawToken) return null;
    const session = await this.sessions.findOne({
      where: {
        tokenHash: hashToken(rawToken),
        expiresAt: MoreThan(new Date()),
      },
      relations: { user: true },
    });
    return session?.user ? { session, user: session.user } : null;
  }

  // O token bruto vem do cookie da requisição: o banco só guarda o hash, e o
  // cookie é reenviado com o Max-Age renovado.
  async touch(
    session: Session,
    response: CookieResponse,
    rawToken: string,
  ): Promise<void> {
    const now = new Date();
    if (now.getTime() - session.lastUsedAt.getTime() <= TOUCH_INTERVAL_MS) {
      return;
    }
    await this.sessions.update(session.id, {
      lastUsedAt: now,
      expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
    });
    response.cookie(SESSION_COOKIE, rawToken, this.cookieOptions());
  }

  async revoke(sessionId: string): Promise<void> {
    await this.sessions.delete(sessionId);
  }

  async revokeAll(
    userId: string,
    { except }: { except?: string } = {},
    manager?: EntityManager,
  ): Promise<void> {
    const sessions = manager?.getRepository(Session) ?? this.sessions;
    const where: FindOptionsWhere<Session> = except
      ? { userId, id: Not(except) }
      : { userId };
    await sessions.delete(where);
  }

  cookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.config.get('NODE_ENV', { infer: true }) === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_TTL_MS,
    };
  }
}
