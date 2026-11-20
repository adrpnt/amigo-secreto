import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { DataSource } from 'typeorm';
import { TooManyAttemptsException } from './too-many-attempts.exception.js';

export type RateRule = { key: string; limit: number; windowMs: number };

export type RateLimitResult = { allowed: boolean; retryAfterMs: number };

type RateLimitKind = 'email' | 'ip' | 'user';

// O e-mail não fica em claro na tabela: a chave leva o SHA-256 do e-mail normalizado.
export function rateLimitKey(
  route: string,
  kind: RateLimitKind,
  value: string,
): string {
  const id =
    kind === 'email'
      ? createHash('sha256').update(value.trim().toLowerCase()).digest('hex')
      : value;
  return `${route}:${kind}:${id}`;
}

// Janela vencida reinicia em 1; senão soma 1. O relógio é o do banco, igual
// para todas as instâncias da API.
const CONSUME_SQL = `
  INSERT INTO rate_limit (key, "windowStart", count)
  VALUES ($1, now(), 1)
  ON CONFLICT (key) DO UPDATE SET
    "windowStart" = CASE
      WHEN rate_limit."windowStart" + $2 * interval '1 millisecond' <= now()
      THEN now() ELSE rate_limit."windowStart" END,
    count = CASE
      WHEN rate_limit."windowStart" + $2 * interval '1 millisecond' <= now()
      THEN 1 ELSE rate_limit.count + 1 END
  RETURNING count,
    GREATEST(0, EXTRACT(EPOCH FROM
      "windowStart" + $2 * interval '1 millisecond' - now()) * 1000
    )::float8 AS "retryAfterMs"`;

@Injectable()
export class RateLimitService {
  constructor(private readonly dataSource: DataSource) {}

  async consume(
    key: string,
    limit: number,
    windowMs: number,
  ): Promise<RateLimitResult> {
    const [row] = await this.dataSource.query<
      { count: number; retryAfterMs: number }[]
    >(CONSUME_SQL, [key, windowMs]);
    return {
      allowed: row.count <= limit,
      retryAfterMs: Math.ceil(row.retryAfterMs),
    };
  }

  async assertWithinLimits(rules: RateRule[]): Promise<void> {
    const results = await Promise.all(
      rules.map(({ key, limit, windowMs }) =>
        this.consume(key, limit, windowMs),
      ),
    );
    const blocked = results.filter((result) => !result.allowed);
    if (blocked.length > 0) {
      throw new TooManyAttemptsException(
        Math.max(...blocked.map((result) => result.retryAfterMs)),
      );
    }
  }
}
