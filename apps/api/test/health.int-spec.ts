import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { inject } from 'vitest';
import { configureApp } from '../src/app.setup.js';
import { type FreezableProxy, startFreezableProxy } from './freezable-proxy.js';

describe('GET /health', () => {
  let proxy: FreezableProxy;
  let app: INestApplication;
  let server: App;

  beforeAll(async () => {
    proxy = await startFreezableProxy(inject('databaseUrl'));
    // O ConfigModule valida o ambiente quando o AppModule é importado.
    vi.stubEnv('DATABASE_URL', proxy.url);
    const { AppModule } = await import('../src/app.module.js');
    app = await NestFactory.create(AppModule, { logger: false });
    configureApp(app);
    await app.init();
    server = app.getHttpServer() as App;
  });

  afterEach(() => {
    proxy.thaw();
  });

  afterAll(async () => {
    await proxy.close();
    await app.close();
    vi.unstubAllEnvs();
  });

  it('responde 200 com status ok quando o banco responde', async () => {
    const response = await request(server).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: 'ok',
      details: { database: { status: 'up' } },
    });
  });

  it('responde 503 com status error quando o banco não responde em 3 segundos', async () => {
    proxy.freeze();

    const startedAt = performance.now();
    const response = await request(server).get('/health');
    const elapsed = performance.now() - startedAt;

    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({
      status: 'error',
      details: { database: { status: 'down' } },
    });
    expect(elapsed).toBeGreaterThanOrEqual(3000);
    expect(elapsed).toBeLessThan(4500);
  });

  it('responde sem cabeçalho de autenticação', async () => {
    const response = await request(server).get('/health');

    expect(response.request.getHeader('authorization')).toBeUndefined();
    expect(response.request.getHeader('cookie')).toBeUndefined();
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: 'ok' });
  });
});
