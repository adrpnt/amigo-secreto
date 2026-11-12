import { getMetadataStorage } from 'class-validator';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseEnv } from 'node:util';
import { EnvironmentVariables, validateEnvironment } from './env.validation.js';

const VALID_DATABASE_URL =
  'postgres://amigo:amigo@localhost:5432/amigo_secreto';

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
