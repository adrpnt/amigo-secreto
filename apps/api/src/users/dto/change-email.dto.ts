import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, ValidateIf } from 'class-validator';

function normalizeEmail({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim().toLowerCase() : value;
}

export class ChangeEmailDto {
  @Transform(normalizeEmail)
  @IsEmail()
  @MaxLength(254)
  newEmail: string;

  // Conta só Google não tem senha: recebe o pedido para criar uma antes.
  @ValidateIf((dto: ChangeEmailDto) => dto.password !== undefined)
  @IsString()
  @MaxLength(128)
  password?: string;
}
