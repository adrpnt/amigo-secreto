import type { SessionUser } from '@amigo-secreto/shared';
import { Controller, HttpCode, Param, Post } from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { InvitesService } from './invites.service.js';

const NOT_FOUND = {
  description:
    'Grupo não encontrado: id inexistente, id que não é UUID ou pessoa sem participação aprovada.',
};
const ORGANIZER_ONLY = {
  description: 'Só quem organiza pode alterar o grupo.',
};
const NOT_OPEN = {
  description: 'Com o sorteio feito, ninguém entra nem sai do grupo.',
};

@ApiTags('groups')
@ApiUnauthorizedResponse({ description: 'Sem sessão válida.' })
@Controller('groups')
export class GroupMembersController {
  constructor(private readonly invites: InvitesService) {}

  @Post(':id/invite/regenerate')
  @HttpCode(200)
  @ApiOkResponse({
    description:
      'Código do convite trocado; o antigo deixa de funcionar e as participações ficam como estavam.',
  })
  @ApiForbiddenResponse(ORGANIZER_ONLY)
  @ApiNotFoundResponse(NOT_FOUND)
  @ApiConflictResponse(NOT_OPEN)
  @ApiTooManyRequestsResponse({
    description:
      'Mais de 10 trocas na hora do grupo; `Retry-After` em segundos.',
  })
  regenerate(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
  ): Promise<{ inviteCode: string }> {
    return this.invites.regenerate(user, id);
  }
}
