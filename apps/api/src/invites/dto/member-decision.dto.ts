import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import type { SeenStatus } from '../members.service.js';

const SEEN_STATUSES: SeenStatus[] = ['PENDING', 'REJECTED'];

export class MemberDecisionDto {
  @ApiProperty({
    description:
      'Status que a tela mostrava. Se a participação já mudou, a API devolve o estado atual sem aviso.',
    enum: SEEN_STATUSES,
  })
  @IsIn(SEEN_STATUSES)
  from: SeenStatus;
}
