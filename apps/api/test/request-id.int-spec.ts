import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { configureApp } from '../src/app.setup.js';
import { AppLogger } from '../src/observability/app-logger.js';
import {
  FIXTURE_LOG_MESSAGE,
  LoggingFixtureModule,
} from './fixtures/logging-fixture.module.js';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe('request id', () => {
  const output: string[] = [];
  let app: INestApplication;
  let server: App;

  function fixtureLogRecords(): Record<string, unknown>[] {
    return output
      .flatMap((chunk) => chunk.split('\n'))
      .filter((line) => line.startsWith('{'))
      .map((line) => JSON.parse(line) as Record<string, unknown>)
      .filter((record) => record.message === FIXTURE_LOG_MESSAGE);
  }

  beforeAll(async () => {
    app = await NestFactory.create(LoggingFixtureModule, {
      logger: new AppLogger('production'),
    });
    configureApp(app);
    await app.init();
    server = app.getHttpServer() as App;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    output.length = 0;
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
      output.push(String(chunk));
      return true;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('devolve o x-request-id recebido e o usa nos logs da requisição', async () => {
    const response = await request(server)
      .get('/fixtures/logging')
      .set('x-request-id', 'req-7f3a');

    expect(response.status).toBe(200);
    expect(response.headers['x-request-id']).toBe('req-7f3a');
    expect(fixtureLogRecords()).toEqual([
      expect.objectContaining({ requestId: 'req-7f3a' }),
    ]);
  });

  it('gera um UUID quando a requisição não traz x-request-id', async () => {
    const first = await request(server).get('/fixtures/logging');
    const second = await request(server).get('/fixtures/logging');

    const firstId = first.headers['x-request-id'];
    const secondId = second.headers['x-request-id'];
    expect(firstId).toMatch(UUID_PATTERN);
    expect(secondId).toMatch(UUID_PATTERN);
    expect(firstId).not.toBe(secondId);
    expect(fixtureLogRecords()).toEqual([
      expect.objectContaining({ requestId: firstId }),
      expect.objectContaining({ requestId: secondId }),
    ]);
  });
});
