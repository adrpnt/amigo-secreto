import { DataSource } from 'typeorm';
import { validateEnvironment } from '../config/env.validation.js';
import { databaseOptions } from './database.options.js';

try {
  process.loadEnvFile();
} catch (error) {
  // Sem .env, a CLI usa só as variáveis do ambiente (ex.: CI e testes).
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
}

export default new DataSource(
  databaseOptions(validateEnvironment(process.env)),
);
