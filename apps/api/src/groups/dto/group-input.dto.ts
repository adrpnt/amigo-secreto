import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

// Data e hora com fuso explícito (Z ou ±hh:mm): sem fuso, o instante
// dependeria do fuso do banco.
const DATE_TIME_WITH_OFFSET =
  /T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;

// Só o formato. As regras dos campos e as mensagens ficam no
// validateGroupInput do shared; por isso o valor do presente aceita número
// não inteiro, que volta 400 com a mensagem do campo. Campo opcional
// ausente vale null, e booleano ausente vale false.
export class GroupInputDto {
  @ApiProperty({
    description: '1 a 80 caracteres depois de tirar os espaços das pontas.',
    example: 'Família 2026',
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: 'Recado para os participantes, até 1.000 caracteres.',
  })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    description:
      'Valor do presente em reais inteiros, de 1 a 100.000; sozinho, vale também como máximo.',
    example: 50,
  })
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  giftMinValue?: number | null;

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    description:
      'Fim da faixa do valor, em reais inteiros; exige o valor inicial.',
    example: 100,
  })
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  giftMaxValue?: number | null;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    nullable: true,
    description: 'Sorteio previsto, com fuso; antes da confraternização.',
    example: '2026-12-10T20:00:00-03:00',
  })
  @IsOptional()
  @IsISO8601({ strict: true, strictSeparator: true })
  @Matches(DATE_TIME_WITH_OFFSET)
  drawScheduledAt?: string | null;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    nullable: true,
    description: 'Confraternização, com fuso.',
    example: '2026-12-20T19:00:00-03:00',
  })
  @IsOptional()
  @IsISO8601({ strict: true, strictSeparator: true })
  @Matches(DATE_TIME_WITH_OFFSET)
  eventAt?: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: 'Endereço ou link, até 200 caracteres.',
  })
  @IsOptional()
  @IsString()
  eventLocation?: string | null;

  @ApiPropertyOptional({ type: Boolean, default: false })
  @IsOptional()
  @IsBoolean()
  isOnlineEvent?: boolean | null;

  @ApiPropertyOptional({ type: Boolean, default: false })
  @IsOptional()
  @IsBoolean()
  requiresApproval?: boolean | null;
}
