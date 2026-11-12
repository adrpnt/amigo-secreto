import { registerAs } from '@nestjs/config';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { validateEnvironment } from '../config/env.validation.js';
import { databaseOptions } from './database.options.js';

export const databaseConfig = registerAs(
  'database',
  (): TypeOrmModuleOptions => ({
    ...databaseOptions(validateEnvironment(process.env)),
    autoLoadEntities: true,
  }),
);
