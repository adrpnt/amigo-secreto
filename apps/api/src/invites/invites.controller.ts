import type {
  InviteView,
  JoinResult,
  SessionUser,
} from '@amigo-secreto/shared';
import {
  Controller,
  Get,
  Headers,
  HttpCode,
  Ip,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Public } from '../auth/decorators/public.decorator.js';
import { InvitesService } from './invites.service.js';

const NOT_FOUND = {
  description:
    'Convite não encontrado: código inexistente, trocado ou com formato errado.',
};

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
  @ApiNotFoundResponse(NOT_FOUND)
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

  @Post(':code/join')
  @HttpCode(200)
  @ApiOkResponse({
    description:
      'Participação criada, aprovada ou pendente conforme o grupo; a quem já participa, o estado atual sem mudança. groupId só se aprovada.',
  })
  @ApiUnauthorizedResponse({ description: 'Sem sessão válida.' })
  @ApiNotFoundResponse(NOT_FOUND)
  @ApiConflictResponse({
    description: 'Grupo SORTEADO ou ENCERRADO não aceita novas entradas.',
  })
  @ApiTooManyRequestsResponse({
    description:
      'IP acima do limite de convites do minuto (antes de procurar o código) ou conta com 30 entradas na hora; `Retry-After` em segundos.',
  })
  join(
    @Param('code') code: string,
    @CurrentUser() user: SessionUser,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string | undefined,
  ): Promise<JoinResult> {
    return this.invites.join(code, user, { ip, userAgent });
  }
}
