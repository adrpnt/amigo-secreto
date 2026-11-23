import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

// Só o formato: um id que não é UUID responde 404, como nas outras rotas de
// participante.
export class TransferDto {
  @ApiProperty({
    description: 'Participação aprovada de quem passa a organizar o grupo.',
    format: 'uuid',
  })
  @IsString()
  membershipId: string;
}
