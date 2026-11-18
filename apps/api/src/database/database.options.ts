import { join } from 'node:path';
import type { DataSourceOptions } from 'typeorm';
import type { EnvironmentVariables } from '../config/env.validation.js';

export function databaseOptions(
  env: Pick<EnvironmentVariables, 'NODE_ENV' | 'DATABASE_URL'>,
): DataSourceOptions {
  return {
    type: 'postgres',
    url: env.DATABASE_URL,
    uuidExtension: 'pgcrypto',
    synchronize: false,
    migrationsRun: false,
    entities: [join(import.meta.dirname, '..', '**', '*.entity.js')],
    migrations: [join(import.meta.dirname, 'migrations', '*.js')],
  };
}
