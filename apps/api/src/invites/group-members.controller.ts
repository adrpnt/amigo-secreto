import type {
  InviteEmailsResult,
  MembersPage,
  SessionUser,
} from '@amigo-secreto/shared';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiQuery,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { InviteEmailsDto } from './dto/invite-emails.dto.js';
import { InvitesService } from './invites.service.js';
import { MembersService } from './members.service.js';

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
  constructor(
    private readonly invites: InvitesService,
    private readonly members: MembersService,
  ) {}

  @Get(':id/members')
  @ApiOkResponse({
    description:
      'Até 20 participantes por página, sem e-mail. Quem organiza recebe pendentes, aprovados por nome e recusados; os outros, só os aprovados. `nextCursor` leva à página seguinte; `approvedCount` conta os aprovados sem a busca.',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Parte do nome, sem diferenciar maiúsculas nem acentos.',
  })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description: 'O `nextCursor` da página anterior.',
  })
  @ApiBadRequestResponse({ description: 'Cursor inválido.' })
  @ApiNotFoundResponse(NOT_FOUND)
  list(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Query('search') search: unknown,
    @Query('cursor') cursor: unknown,
  ): Promise<MembersPage> {
    return this.members.list(user.id, id, { search, cursor });
  }

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

  @Post(':id/invite/emails')
  @HttpCode(200)
  @ApiOkResponse({
    description:
      'Um convite por endereço distinto enfileirado e gravado; `count` é a quantidade enviada.',
  })
  @ApiBadRequestResponse({
    description:
      'Lista vazia, com endereço inválido ou com mais de 20 distintos; `fields.emails` traz a mensagem.',
  })
  @ApiForbiddenResponse(ORGANIZER_ONLY)
  @ApiNotFoundResponse(NOT_FOUND)
  @ApiConflictResponse(NOT_OPEN)
  @ApiTooManyRequestsResponse({
    description:
      'O envio passaria de 100 convites por e-mail do grupo em 24 horas; `Retry-After` em segundos.',
  })
  sendEmails(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body() body: InviteEmailsDto,
  ): Promise<InviteEmailsResult> {
    return this.invites.sendEmails(user, id, body.emails);
  }
}
