import type { InviteView, SessionUser } from '@amigo-secreto/shared';
import { Controller, Get, Headers, Ip, Param } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Public } from '../auth/decorators/public.decorator.js';
import { InvitesService } from './invites.service.js';

@ApiTags('invites')
@Controller('invites')
export class InvitesController {
  constructor(private readonly invites: InvitesService) {}

  @Get(':code')
  @Public()
  @ApiOkResponse({
    description:
      'Nome do grupo, nome de quem organiza, status, exigência de aprovação e o estado de quem abre; groupId só para participante aprovado.',
  })
  @ApiNotFoundResponse({
    description:
      'Convite não encontrado: código inexistente, trocado ou com formato errado.',
  })
  @ApiTooManyRequestsResponse({
    description:
      'Mais de 60 convites no minuto do mesmo IP (600 para robôs de preview), antes de procurar o código; `Retry-After` em segundos.',
  })
  view(
    @Param('code') code: string,
    @CurrentUser() user: SessionUser | undefined,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string | undefined,
  ): Promise<InviteView> {
    return this.invites.view(code, user, { ip, userAgent });
  }
}
