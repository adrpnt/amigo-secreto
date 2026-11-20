import { createHash, randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { DataSource } from 'typeorm';
import { configureApp } from '../src/app.setup.js';
import { databaseOptions } from '../src/database/database.options.js';
import {
  RateLimitService,
  rateLimitKey,
} from '../src/rate-limit/rate-limit.service.js';
import { createIsolatedDatabase } from './isolated-database.js';

const MINUTE_MS = 60_000;

describe('RateLimitService', () => {
  let app: INestApplication;
  let server: App;
  let dataSource: DataSource;
  let rateLimit: RateLimitService;

  beforeAll(async () => {
    // O ConfigModule valida o ambiente quando o módulo é importado.
    vi.stubEnv('DATABASE_URL', await createIsolatedDatabase('rate_limit'));
    const { RateLimitFixtureModule } =
      await import('./fixtures/rate-limit-fixture.module.js');
    app = await NestFactory.create(RateLimitFixtureModule, { logger: false });
    configureApp(app);
    await app.init();
    server = app.getHttpServer() as App;
    dataSource = app.get(DataSource);
    rateLimit = app.get(RateLimitService);
  });

  afterAll(async () => {
    await app.close();
    vi.unstubAllEnvs();
  });

  // Recua o início da janela da chave, como se o tempo tivesse passado.
  async function moveWindowBack(key: string, ms: number): Promise<void> {
    await dataSource.query(
      `UPDATE rate_limit SET "windowStart" = "windowStart" - $2 * interval '1 millisecond' WHERE key = $1`,
      [key, ms],
    );
  }

  async function countOf(key: string): Promise<number> {
    const [row] = await dataSource.query<{ count: number }[]>(
      'SELECT count FROM rate_limit WHERE key = $1',
      [key],
    );
    return row?.count ?? 0;
  }

  it('permite até o limite e recusa a tentativa seguinte na mesma janela', async () => {
    const key = `teste:${randomUUID()}`;

    const allowed = [];
    for (let attempt = 1; attempt <= 4; attempt++) {
      allowed.push((await rateLimit.consume(key, 3, 15 * MINUTE_MS)).allowed);
    }

    expect(allowed).toEqual([true, true, true, false]);
  });

  it('reinicia a contagem quando a janela vence', async () => {
    const key = `teste:${randomUUID()}`;
    await rateLimit.consume(key, 1, 15 * MINUTE_MS);
    await rateLimit.consume(key, 1, 15 * MINUTE_MS);
    expect((await rateLimit.consume(key, 1, 15 * MINUTE_MS)).allowed).toBe(
      false,
    );

    await moveWindowBack(key, 15 * MINUTE_MS);

    const result = await rateLimit.consume(key, 1, 15 * MINUTE_MS);
    expect(result.allowed).toBe(true);
    expect(await countOf(key)).toBe(1);
    expect(result.retryAfterMs).toBeGreaterThan(15 * MINUTE_MS - 5000);
  });

  it('soma as tentativas de duas conexões ao mesmo tempo sem perder nenhuma', async () => {
    const key = `teste:${randomUUID()}`;
    // Segunda instância da API: outro pool de conexões no mesmo banco.
    const otherDataSource = new DataSource({
      ...databaseOptions({
        NODE_ENV: 'test',
        DATABASE_URL: process.env.DATABASE_URL!,
      }),
      entities: [],
      migrations: [],
    });
    await otherDataSource.initialize();
    const other = new RateLimitService(otherDataSource);
    try {
      const attempts = Array.from({ length: 40 }, (_, index) =>
        (index % 2 === 0 ? rateLimit : other).consume(key, 30, 15 * MINUTE_MS),
      );

      const results = await Promise.all(attempts);

      expect(await countOf(key)).toBe(40);
      expect(results.filter((result) => result.allowed)).toHaveLength(30);
    } finally {
      await otherDataSource.destroy();
    }
  });

  it('devolve o tempo que falta para a janela vencer', async () => {
    const key = `teste:${randomUUID()}`;
    await rateLimit.consume(key, 5, 15 * MINUTE_MS);
    await moveWindowBack(key, 4 * MINUTE_MS);

    const { retryAfterMs } = await rateLimit.consume(key, 5, 15 * MINUTE_MS);

    expect(retryAfterMs).toBeLessThanOrEqual(11 * MINUTE_MS);
    expect(retryAfterMs).toBeGreaterThan(11 * MINUTE_MS - 5000);
  });

  it('lança 429 com "Muitas tentativas. Tente de novo em N minutos." quando uma regra estoura', async () => {
    const key = `teste:${randomUUID()}`;

    const first = await request(server).get(`/fixtures/rate-limit/${key}`);
    const second = await request(server).get(`/fixtures/rate-limit/${key}`);

    expect(first.status).toBe(200);
    expect(second.status).toBe(429);
    expect(second.body).toEqual({
      statusCode: 429,
      message: 'Muitas tentativas. Tente de novo em 10 minutos.',
      error: 'Too Many Requests',
    });
    expect(Number(second.headers['retry-after'])).toBeGreaterThan(595);
    expect(Number(second.headers['retry-after'])).toBeLessThanOrEqual(600);

    // Faltando 30 segundos, N arredonda para cima e fica no singular.
    await moveWindowBack(key, 9.5 * MINUTE_MS);
    const third = await request(server).get(`/fixtures/rate-limit/${key}`);
    expect(third.status).toBe(429);
    expect((third.body as { message: string }).message).toBe(
      'Muitas tentativas. Tente de novo em 1 minuto.',
    );
    expect(Number(third.headers['retry-after'])).toBeGreaterThan(25);
    expect(Number(third.headers['retry-after'])).toBeLessThanOrEqual(30);

    // Com 4 minutos e 1 segundo restantes, N arredonda para 5.
    await rateLimit.consume(`${key}:outra`, 1, 4 * MINUTE_MS + 1000);
    await expect(
      rateLimit.assertWithinLimits([
        { key: `${key}:outra`, limit: 1, windowMs: 4 * MINUTE_MS + 1000 },
        { key: `${key}:livre`, limit: 1, windowMs: 15 * MINUTE_MS },
      ]),
    ).rejects.toMatchObject({
      response: { message: 'Muitas tentativas. Tente de novo em 5 minutos.' },
    });
    // A regra livre foi consumida junto da que estourou.
    expect(await countOf(`${key}:livre`)).toBe(1);
  });

  it('guarda o e-mail só como SHA-256 na chave', async () => {
    const key = rateLimitKey('login', 'email', '  Ana.Silva@Exemplo.com ');

    await rateLimit.consume(key, 10, 15 * MINUTE_MS);

    const sha256 = createHash('sha256')
      .update('ana.silva@exemplo.com')
      .digest('hex');
    expect(key).toBe(`login:email:${sha256}`);
    const rows = await dataSource.query<{ key: string }[]>(
      "SELECT key FROM rate_limit WHERE key LIKE 'login:email:%'",
    );
    expect(rows.map((row) => row.key)).toEqual([`login:email:${sha256}`]);
    expect(JSON.stringify(rows)).not.toMatch(/exemplo|ana/i);
    expect(rateLimitKey('login', 'ip', '203.0.113.7')).toBe(
      'login:ip:203.0.113.7',
    );
  });
});
