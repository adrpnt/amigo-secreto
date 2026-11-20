import { Transform } from 'class-transformer';
import { IsBoolean, IsString, Length, ValidateIf } from 'class-validator';

function trim({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

// Campo ausente não muda; null conta como valor e é recusado.
export class UpdateProfileDto {
  @ValidateIf((dto: UpdateProfileDto) => dto.name !== undefined)
  @Transform(trim)
  @IsString()
  @Length(1, 80)
  name?: string;

  @ValidateIf((dto: UpdateProfileDto) => dto.marketingOptIn !== undefined)
  @IsBoolean()
  marketingOptIn?: boolean;
}
