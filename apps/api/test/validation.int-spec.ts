import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { configureApp } from '../src/app.setup.js';
import {
  receivedBodies,
  ValidationFixtureModule,
} from './fixtures/validation-fixture.module.js';

const ROUTE = '/fixtures/validation';

describe('validação de entrada', () => {
  let app: INestApplication;
  let server: App;

  beforeAll(async () => {
    app = await NestFactory.create(ValidationFixtureModule, { logger: false });
    configureApp(app);
    await app.init();
    server = app.getHttpServer() as App;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    receivedBodies.length = 0;
  });

  it('responde 400 e não executa o handler quando o corpo tem campo não declarado', async () => {
    const response = await request(server)
      .post(ROUTE)
      .send({ name: 'Ana', age: 30, isAdmin: true });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      statusCode: 400,
      message: ['property isAdmin should not exist'],
      error: 'Bad Request',
    });
    expect(receivedBodies).toEqual([]);
  });

  it('responde 400 com uma mensagem por regra violada', async () => {
    const response = await request(server)
      .post(ROUTE)
      .send({ name: 'An', age: -1 });

    expect(response.status).toBe(400);
    const { message } = response.body as { message: string[] };
    expect(message).toHaveLength(2);
    expect(message).toEqual(
      expect.arrayContaining([
        'name must be longer than or equal to 3 characters',
        'age must not be less than 0',
      ]),
    );

    const twoRulesOnOneField = await request(server)
      .post(ROUTE)
      .send({ name: 42, age: 30 });

    expect(twoRulesOnOneField.status).toBe(400);
    const twoRulesBody = twoRulesOnOneField.body as { message: string[] };
    expect(twoRulesBody.message).toHaveLength(2);
    expect(twoRulesBody.message).toEqual(
      expect.arrayContaining([
        'name must be longer than or equal to 3 characters',
        'name must be a string',
      ]),
    );
    expect(receivedBodies).toEqual([]);
  });

  it('responde no formato statusCode, message e error', async () => {
    const response = await request(server)
      .post(ROUTE)
      .send({ name: 42, age: 'trinta' });

    expect(response.status).toBe(400);
    expect(Object.keys(response.body as object).sort()).toEqual([
      'error',
      'message',
      'statusCode',
    ]);
    expect(response.body).toMatchObject({
      statusCode: 400,
      error: 'Bad Request',
    });
  });
});
