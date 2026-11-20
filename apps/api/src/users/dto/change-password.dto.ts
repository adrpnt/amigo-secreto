import { IsString, Length, MaxLength, ValidateIf } from 'class-validator';

export class ChangePasswordDto {
  // Exigida só de conta com senha; a conta só Google cria a senha sem ela.
  @ValidateIf((dto: ChangePasswordDto) => dto.currentPassword !== undefined)
  @IsString()
  @MaxLength(128)
  currentPassword?: string;

  @IsString()
  @Length(8, 128)
  newPassword: string;
}
