import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as Sentry from '@sentry/nestjs';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { configureApp } from '../src/app.setup.js';
import {
  ErrorsFixtureModule,
  INTERNAL_DETAIL,
} from './fixtures/errors-fixture.module.js';

describe('AllExceptionsFilter', () => {
  const sentEvents: Sentry.ErrorEvent[] = [];
  let app: INestApplication;
  let server: App;

  beforeAll(async () => {
    Sentry.init({
      dsn: 'https://public@sentry.example.com/1',
      defaultIntegrations: false,
      beforeSend(event) {
        sentEvents.push(event);
        return null;
      },
    });
    app = await NestFactory.create(ErrorsFixtureModule, { logger: false });
    configureApp(app);
    await app.init();
    server = app.getHttpServer() as App;
  });

  afterAll(async () => {
    await app.close();
    await Sentry.close();
  });

  beforeEach(() => {
    sentEvents.length = 0;
  });

  it('responde 500 com Erro interno sem stack nem mensagem original', async () => {
    const response = await request(server).get('/fixtures/errors/unhandled');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      statusCode: 500,
      message: 'Erro interno',
      error: 'Internal Server Error',
    });
    expect(response.text).not.toContain(INTERNAL_DETAIL);
    expect(response.text).not.toMatch(/\bat .+:\d+:\d+/);
  });

  it('responde Erro interno quando o handler lança InternalServerErrorException com mensagem', async () => {
    const response = await request(server).get(
      '/fixtures/errors/internal-with-message',
    );

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      statusCode: 500,
      message: 'Erro interno',
      error: 'Internal Server Error',
    });
    expect(response.text).not.toContain(INTERNAL_DETAIL);
  });

  it('envia ao Sentry a exceção que resulta em 500', async () => {
    await request(server).get('/fixtures/errors/unhandled');
    await Sentry.flush(2000);

    expect(sentEvents).toHaveLength(1);
    expect(sentEvents[0]?.exception?.values?.[0]).toMatchObject({
      type: 'Error',
      value: INTERNAL_DETAIL,
    });
  });

  it('envia ao Sentry a InternalServerErrorException lançada com mensagem', async () => {
    await request(server).get('/fixtures/errors/internal-with-message');
    await Sentry.flush(2000);

    expect(sentEvents).toHaveLength(1);
    expect(sentEvents[0]?.exception?.values?.[0]).toMatchObject({
      type: 'InternalServerErrorException',
      value: INTERNAL_DETAIL,
    });
  });

  it('não envia ao Sentry erros que resultam em 4xx', async () => {
    const badRequest = await request(server).get(
      '/fixtures/errors/bad-request',
    );
    const notFound = await request(server).get('/fixtures/errors/not-found');
    await Sentry.flush(2000);

    expect(badRequest.status).toBe(400);
    expect(badRequest.body).toEqual({
      statusCode: 400,
      message: 'Pedido inválido',
      error: 'Bad Request',
    });
    expect(notFound.status).toBe(404);
    expect(notFound.body).toEqual({
      statusCode: 404,
      message: 'Grupo não encontrado',
      error: 'Not Found',
    });
    expect(sentEvents).toEqual([]);
  });
});
