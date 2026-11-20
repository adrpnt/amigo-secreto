import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  ValidateIf,
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

  @ValidateIf(isProduction)
  @IsString()
  @IsNotEmpty()
  RESEND_API_KEY?: string;

  @ValidateIf(isProduction)
  @IsString()
  @IsNotEmpty()
  EMAIL_FROM?: string;

  @IsUrl({
    protocols: ['http', 'https'],
    require_protocol: true,
    require_tld: false,
  })
  RESEND_BASE_URL: string = 'https://api.resend.com';

  @ValidateIf(isProduction)
  @IsUrl({
    protocols: ['http', 'https'],
    require_protocol: true,
    require_tld: false,
  })
  WEB_URL?: string;

  @ValidateIf(isProduction)
  @IsString()
  @IsNotEmpty()
  AUTH_SECRET?: string;

  @ValidateIf(isProduction)
  @IsString()
  @IsNotEmpty()
  GOOGLE_CLIENT_ID?: string;

  @ValidateIf(isProduction)
  @IsString()
  @IsNotEmpty()
  GOOGLE_CLIENT_SECRET?: string;

  @IsUrl({
    protocols: ['https', 'http'],
    require_protocol: true,
    require_tld: false,
  })
  GOOGLE_AUTH_URL: string = 'https://accounts.google.com/o/oauth2/v2/auth';

  @IsUrl({
    protocols: ['https', 'http'],
    require_protocol: true,
    require_tld: false,
  })
  GOOGLE_TOKEN_URL: string = 'https://oauth2.googleapis.com/token';

  @ValidateIf(isProduction)
  @IsInt()
  @Min(0)
  TRUST_PROXY_HOPS?: number;
}

// Valor vazio no .env conta como ausente (ex.: GOOGLE_CLIENT_ID= no .env.example).
const EMPTY_AS_ABSENT = [
  'WEB_URL',
  'AUTH_SECRET',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_AUTH_URL',
  'GOOGLE_TOKEN_URL',
  'TRUST_PROXY_HOPS',
];

// Padrões só fora de production; em production essas variáveis são obrigatórias.
const DEVELOPMENT_WEB_URL = 'http://localhost:3000';
const DEVELOPMENT_AUTH_SECRET = 'amigo-secreto-dev-auth-secret';

function isProduction(env: EnvironmentVariables): boolean {
  return env.NODE_ENV === 'production';
}

export function validateEnvironment(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const present = Object.fromEntries(
    Object.entries(config).filter(
      ([name, value]) => !(EMPTY_AS_ABSENT.includes(name) && value === ''),
    ),
  );
  const env = plainToInstance(EnvironmentVariables, present, {
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

  if (!isProduction(env)) {
    env.WEB_URL ??= DEVELOPMENT_WEB_URL;
    env.AUTH_SECRET ??= DEVELOPMENT_AUTH_SECRET;
  }
  return env;
}
