import { Transform } from 'class-transformer';
import {
  Equals,
  IsBoolean,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

function trim({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class GoogleCompleteDto {
  @Transform(trim)
  @IsString()
  @Length(1, 80)
  name: string;

  @Equals(true)
  acceptTerms: true;

  @IsOptional()
  @IsBoolean()
  marketingOptIn?: boolean;
}
