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
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  giftMinValue?: number | null;

  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  giftMaxValue?: number | null;

  @IsOptional()
  @IsISO8601({ strict: true, strictSeparator: true })
  @Matches(DATE_TIME_WITH_OFFSET)
  drawScheduledAt?: string | null;

  @IsOptional()
  @IsISO8601({ strict: true, strictSeparator: true })
  @Matches(DATE_TIME_WITH_OFFSET)
  eventAt?: string | null;

  @IsOptional()
  @IsString()
  eventLocation?: string | null;

  @IsOptional()
  @IsBoolean()
  isOnlineEvent?: boolean | null;

  @IsOptional()
  @IsBoolean()
  requiresApproval?: boolean | null;
}
