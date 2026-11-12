import type { NodeEnvironment } from '../config/env.validation.js';
import { databaseOptions } from './database.options.js';

const DATABASE_URL = 'postgres://amigo:amigo@localhost:5432/amigo_secreto';
const NODE_ENVIRONMENTS: NodeEnvironment[] = [
  'development',
  'test',
  'production',
];

describe('databaseOptions', () => {
  it('desliga synchronize em development, test e production', () => {
    for (const NODE_ENV of NODE_ENVIRONMENTS) {
      expect(databaseOptions({ NODE_ENV, DATABASE_URL }).synchronize).toBe(
        false,
      );
    }
  });

  it('não roda migrations ao iniciar', () => {
    for (const NODE_ENV of NODE_ENVIRONMENTS) {
      expect(databaseOptions({ NODE_ENV, DATABASE_URL }).migrationsRun).toBe(
        false,
      );
    }
  });
});
