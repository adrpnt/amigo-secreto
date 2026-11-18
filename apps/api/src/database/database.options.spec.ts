import { join, matchesGlob } from 'node:path';
import type { NodeEnvironment } from '../config/env.validation.js';
import { databaseOptions } from './database.options.js';

const SOURCE_ROOT = join(import.meta.dirname, '..');
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

  it('carrega as entidades pelo glob de *.entity.js', () => {
    const { entities } = databaseOptions({
      NODE_ENV: 'production',
      DATABASE_URL,
    });

    expect(entities).toHaveLength(1);
    const [pattern] = entities as string[];
    expect(
      matchesGlob(join(SOURCE_ROOT, 'jobs', 'job.entity.js'), pattern),
    ).toBe(true);
    expect(
      matchesGlob(join(SOURCE_ROOT, 'jobs', 'job-queue.service.js'), pattern),
    ).toBe(false);
  });
});
