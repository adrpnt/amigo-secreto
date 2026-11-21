import { getMetadataStorage } from 'class-validator';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseEnv } from 'node:util';
import { EnvironmentVariables, validateEnvironment } from './env.validation.js';

const VALID_DATABASE_URL =
  'postgres://amigo:amigo@localhost:5432/amigo_secreto';

const PRODUCTION: Record<string, string> = {
  NODE_ENV: 'production',
  DATABASE_URL: VALID_DATABASE_URL,
  RESEND_API_KEY: 're_123',
  EMAIL_FROM: 'Amigo Secreto <nao-responda@example.com>',
  WEB_URL: 'https://amigo-secreto.example.com',
  AUTH_SECRET: 'segredo-de-producao',
  GOOGLE_CLIENT_ID: 'google-client',
  GOOGLE_CLIENT_SECRET: 'google-secret',
  TRUST_PROXY_HOPS: '1',
};

// Nomes das variáveis citadas no erro de validação, uma por linha "NOME: motivo".
function invalidVariables(config: Record<string, string>): string[] {
  try {
    validateEnvironment(config);
    return [];
  } catch (error) {
    return [...(error as Error).message.matchAll(/^([A-Z_]+):/gm)].map(
      ([, name]) => name ?? '',
    );
  }
}

describe('validateEnvironment', () => {
  it('lança erro que nomeia DATABASE_URL quando ela falta', () => {
    expect(() => validateEnvironment({})).toThrow(/DATABASE_URL/);
  });

  it('lança erro que nomeia DATABASE_URL quando ela não é uma URL postgres', () => {
    expect(() =>
      validateEnvironment({ DATABASE_URL: 'mysql://amigo:amigo@localhost/db' }),
    ).toThrow(/DATABASE_URL/);
    expect(() => validateEnvironment({ DATABASE_URL: 'não é url' })).toThrow(
      /DATABASE_URL/,
    );
  });

  it('aplica PORT 3001 e NODE_ENV development por padrão', () => {
    const env = validateEnvironment({ DATABASE_URL: VALID_DATABASE_URL });

    expect(env.PORT).toBe(3001);
    expect(env.NODE_ENV).toBe('development');
  });

  it('lança erro que nomeia RESEND_API_KEY quando ela falta em production', () => {
    const production = {
      NODE_ENV: 'production',
      DATABASE_URL: VALID_DATABASE_URL,
      EMAIL_FROM: 'Amigo Secreto <nao-responda@example.com>',
    };

    expect(() => validateEnvironment(production)).toThrow(/RESEND_API_KEY/);
    expect(() =>
      validateEnvironment({ ...production, RESEND_API_KEY: '' }),
    ).toThrow(/RESEND_API_KEY/);
    expect(() =>
      validateEnvironment({ ...production, RESEND_API_KEY: '' }),
    ).not.toThrow(/EMAIL_FROM/);
  });

  it('lança erro que nomeia EMAIL_FROM quando ela falta em production', () => {
    const production = {
      NODE_ENV: 'production',
      DATABASE_URL: VALID_DATABASE_URL,
      RESEND_API_KEY: 're_123',
    };

    expect(() => validateEnvironment(production)).toThrow(/EMAIL_FROM/);
    expect(() =>
      validateEnvironment({ ...production, EMAIL_FROM: '' }),
    ).toThrow(/EMAIL_FROM/);
    expect(() =>
      validateEnvironment({ ...production, EMAIL_FROM: '' }),
    ).not.toThrow(/RESEND_API_KEY/);
  });

  it('aceita RESEND_API_KEY e EMAIL_FROM ausentes fora de production', () => {
    for (const nodeEnv of ['development', 'test']) {
      const env = validateEnvironment({
        NODE_ENV: nodeEnv,
        DATABASE_URL: VALID_DATABASE_URL,
      });

      expect(env.NODE_ENV).toBe(nodeEnv);
      expect(env.RESEND_API_KEY).toBeUndefined();
      expect(env.EMAIL_FROM).toBeUndefined();
    }
  });

  it('aceita MAILPIT_URL ausente ou vazia e lança erro que a nomeia quando não é uma URL http', () => {
    const base = { NODE_ENV: 'development', DATABASE_URL: VALID_DATABASE_URL };

    expect(validateEnvironment(base).MAILPIT_URL).toBeUndefined();
    expect(
      validateEnvironment({ ...base, MAILPIT_URL: '' }).MAILPIT_URL,
    ).toBeUndefined();
    expect(
      validateEnvironment({ ...base, MAILPIT_URL: 'http://localhost:8025' })
        .MAILPIT_URL,
    ).toBe('http://localhost:8025');
    expect(
      invalidVariables({ ...base, MAILPIT_URL: 'localhost:8025' }),
    ).toEqual(['MAILPIT_URL']);
  });

  for (const name of [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'AUTH_SECRET',
    'TRUST_PROXY_HOPS',
  ]) {
    it(`lança erro que nomeia ${name} quando ela falta em production`, () => {
      const missing = { ...PRODUCTION };
      delete missing[name];

      expect(invalidVariables(PRODUCTION)).toEqual([]);
      expect(invalidVariables(missing)).toEqual([name]);
      expect(invalidVariables({ ...PRODUCTION, [name]: '' })).toEqual([name]);
    });
  }

  it('aceita as variáveis da conta ausentes fora de production, com WEB_URL http://localhost:3000', () => {
    const empty = {
      WEB_URL: '',
      AUTH_SECRET: '',
      GOOGLE_CLIENT_ID: '',
      GOOGLE_CLIENT_SECRET: '',
      TRUST_PROXY_HOPS: '',
      GOOGLE_AUTH_URL: '',
      GOOGLE_TOKEN_URL: '',
    };

    for (const nodeEnv of ['development', 'test']) {
      for (const accountVariables of [{}, empty]) {
        const env = validateEnvironment({
          NODE_ENV: nodeEnv,
          DATABASE_URL: VALID_DATABASE_URL,
          ...accountVariables,
        });

        expect(env.WEB_URL).toBe('http://localhost:3000');
        expect(env.AUTH_SECRET).toBe('amigo-secreto-dev-auth-secret');
        expect(env.GOOGLE_CLIENT_ID).toBeUndefined();
        expect(env.GOOGLE_CLIENT_SECRET).toBeUndefined();
        expect(env.TRUST_PROXY_HOPS).toBeUndefined();
        expect(env.GOOGLE_AUTH_URL).toBe(
          'https://accounts.google.com/o/oauth2/v2/auth',
        );
        expect(env.GOOGLE_TOKEN_URL).toBe(
          'https://oauth2.googleapis.com/token',
        );
      }
    }
  });

  it('o .env.example declara todas as variáveis validadas', () => {
    const validated = new Set(
      getMetadataStorage()
        .getTargetValidationMetadatas(EnvironmentVariables, '', true, false)
        .map((metadata) => metadata.propertyName),
    );
    const example = parseEnv(
      readFileSync(join(import.meta.dirname, '../../.env.example'), 'utf8'),
    );

    expect(validated.size).toBeGreaterThan(0);
    expect(Object.keys(example)).toEqual(
      expect.arrayContaining([...validated]),
    );
  });
});
