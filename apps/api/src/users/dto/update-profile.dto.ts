import { Transform } from 'class-transformer';
import { IsBoolean, IsString, ValidateIf } from 'class-validator';
import { NameLength } from '../name-length.js';

function trim({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

// Campo ausente não muda; null conta como valor e é recusado.
export class UpdateProfileDto {
  @ValidateIf((dto: UpdateProfileDto) => dto.name !== undefined)
  @Transform(trim)
  @IsString()
  @NameLength()
  name?: string;

  @ValidateIf((dto: UpdateProfileDto) => dto.marketingOptIn !== undefined)
  @IsBoolean()
  marketingOptIn?: boolean;
}
