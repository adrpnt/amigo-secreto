import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

// Só o formato. A separação, a validação e as mensagens ficam no
// validateInviteEmails do shared.
export class InviteEmailsDto {
  @ApiProperty({
    description:
      'Endereços separados por vírgula, ponto e vírgula, espaço ou quebra de linha; até 20 distintos.',
    example: 'bia@exemplo.com, caio@exemplo.com',
  })
  @IsString()
  emails: string;
}
