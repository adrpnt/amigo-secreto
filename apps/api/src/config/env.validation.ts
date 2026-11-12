import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  validateSync,
} from 'class-validator';

export type NodeEnvironment = 'development' | 'test' | 'production';

const NODE_ENVIRONMENTS: NodeEnvironment[] = [
  'development',
  'test',
  'production',
];

export class EnvironmentVariables {
  @IsIn(NODE_ENVIRONMENTS)
  NODE_ENV: NodeEnvironment = 'development';

  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number = 3001;

  @IsUrl({
    protocols: ['postgres', 'postgresql'],
    require_protocol: true,
    require_tld: false,
  })
  DATABASE_URL: string;

  @IsOptional()
  @IsString()
  SENTRY_DSN?: string;
}

export function validateEnvironment(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const env = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(env, { skipMissingProperties: false });

  if (errors.length > 0) {
    const details = errors
      .map(
        (error) =>
          `${error.property}: ${Object.values(error.constraints ?? {}).join('; ')}`,
      )
      .join('\n');
    throw new Error(`Variáveis de ambiente inválidas:\n${details}`);
  }

  return env;
}
