import { validateEnvironment } from './env.validation.js';

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
});
