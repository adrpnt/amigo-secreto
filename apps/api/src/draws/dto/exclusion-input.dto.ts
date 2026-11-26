import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

// Só o formato. Pessoa ausente, repetida ou par já existente voltam 400 com
// a mensagem do validateExclusionInput do shared; participação que não é
// aprovada no grupo, 404.
export class ExclusionInputDto {
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    format: 'uuid',
    description: 'Participação aprovada de uma das pessoas do par.',
  })
  @IsOptional()
  @IsString()
  a?: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    format: 'uuid',
    description:
      'Participação aprovada da pessoa que não tira e não é tirada por `a`.',
  })
  @IsOptional()
  @IsString()
  b?: string | null;
}
