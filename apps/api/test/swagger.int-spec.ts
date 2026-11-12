import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { inject } from 'vitest';
import { configureApp } from '../src/app.setup.js';

type OpenApiDocument = {
  openapi: string;
  paths: Record<string, Record<string, { responses: Record<string, unknown> }>>;
};

async function createApp(nodeEnv: string): Promise<INestApplication> {
  vi.stubEnv('NODE_ENV', nodeEnv);
  const { AppModule } = await import('../src/app.module.js');
  const app = await NestFactory.create(AppModule, { logger: false });
  configureApp(app);
  await app.init();
  return app;
}

describe('Swagger', () => {
  const apps: INestApplication[] = [];

  async function serverFor(nodeEnv: string): Promise<App> {
    const app = await createApp(nodeEnv);
    apps.push(app);
    return app.getHttpServer() as App;
  }

  beforeAll(() => {
    // O ConfigModule valida o ambiente quando o AppModule é importado.
    vi.stubEnv('DATABASE_URL', inject('databaseUrl'));
  });

  afterAll(async () => {
    await Promise.all(apps.map((app) => app.close()));
    vi.unstubAllEnvs();
  });

  it('serve /docs e /docs-json fora de produção', async () => {
    for (const nodeEnv of ['development', 'test']) {
      const server = await serverFor(nodeEnv);

      const ui = await request(server).get('/docs');
      expect(ui.status).toBe(200);
      expect(ui.headers['content-type']).toContain('text/html');
      expect(ui.text).toContain('swagger-ui');

      const json = await request(server).get('/docs-json');
      expect(json.status).toBe(200);
      expect(json.body).toMatchObject({
        openapi: expect.any(String) as string,
        info: { title: 'Amigo Secreto API', version: '0.0.0' },
      });
    }
  });

  it('responde 404 em /docs e /docs-json em produção', async () => {
    const server = await serverFor('production');

    const ui = await request(server).get('/docs');
    const json = await request(server).get('/docs-json');

    expect(ui.status).toBe(404);
    expect(json.status).toBe(404);
  });

  it('documenta GET /health com as respostas 200 e 503', async () => {
    const server = await serverFor('development');

    const response = await request(server).get('/docs-json');
    const document = response.body as OpenApiDocument;

    expect(
      Object.keys(document.paths['/health']?.get?.responses ?? {}),
    ).toEqual(expect.arrayContaining(['200', '503']));
  });
});
