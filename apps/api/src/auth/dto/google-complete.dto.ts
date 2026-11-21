import { Transform } from 'class-transformer';
import { Equals, IsBoolean, IsOptional, IsString } from 'class-validator';
import { NameLength } from '../../users/name-length.js';

function trim({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class GoogleCompleteDto {
  @Transform(trim)
  @IsString()
  @NameLength()
  name: string;

  @Equals(true)
  acceptTerms: true;

  @IsOptional()
  @IsBoolean()
  marketingOptIn?: boolean;
}
