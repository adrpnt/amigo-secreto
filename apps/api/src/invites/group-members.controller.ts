import type {
  GroupDetail,
  InviteEmailsResult,
  MemberItem,
  MembersPage,
  SessionUser,
} from '@amigo-secreto/shared';
import {
  Body,
  Controller,
  Delete,
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
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiQuery,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { InviteEmailsDto } from './dto/invite-emails.dto.js';
import { MemberDecisionDto } from './dto/member-decision.dto.js';
import { TransferDto } from './dto/transfer.dto.js';
import { InvitesService } from './invites.service.js';
import { MembersService } from './members.service.js';

const NOT_FOUND = {
  description:
    'Grupo não encontrado: id inexistente, id que não é UUID ou pessoa sem participação aprovada.',
};
const ORGANIZER_ONLY = {
  description: 'Só quem organiza pode alterar o grupo.',
};
const MEMBER_NOT_FOUND = {
  description:
    'Grupo não encontrado (como nas outras rotas) ou Participante não encontrado.: participação inexistente, de outro grupo ou com id que não é UUID.',
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

  @Post(':id/members/:membershipId/approve')
  @HttpCode(200)
  @ApiOkResponse({
    description:
      'Participação aprovada, com o aviso à pessoa. Se ela já estava aprovada ou não está mais no status `from`, devolve o estado atual sem aviso.',
  })
  @ApiBadRequestResponse({ description: '`from` ausente ou inválido.' })
  @ApiForbiddenResponse(ORGANIZER_ONLY)
  @ApiNotFoundResponse(MEMBER_NOT_FOUND)
  @ApiConflictResponse(NOT_OPEN)
  approve(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Param('membershipId') membershipId: string,
    @Body() body: MemberDecisionDto,
  ): Promise<MemberItem> {
    return this.members.approve(user, id, membershipId, body.from);
  }

  @Post(':id/members/:membershipId/reject')
  @HttpCode(200)
  @ApiOkResponse({
    description:
      'Pedido recusado, com o aviso à pessoa. Se ela já estava recusada ou não está mais no status `from`, devolve o estado atual sem aviso.',
  })
  @ApiBadRequestResponse({ description: '`from` ausente ou inválido.' })
  @ApiForbiddenResponse(ORGANIZER_ONLY)
  @ApiNotFoundResponse({
    description: `${MEMBER_NOT_FOUND.description} Também para participação aprovada: tirar um aprovado é remover.`,
  })
  @ApiConflictResponse(NOT_OPEN)
  reject(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Param('membershipId') membershipId: string,
    @Body() body: MemberDecisionDto,
  ): Promise<MemberItem> {
    return this.members.reject(user, id, membershipId, body.from);
  }

  @Delete(':id/members/:membershipId')
  @HttpCode(204)
  @ApiNoContentResponse({
    description:
      'Participação aprovada passa a recusada, com o aviso à pessoa: ela não volta pelo link sem a aprovação de quem organiza.',
  })
  @ApiForbiddenResponse(ORGANIZER_ONLY)
  @ApiNotFoundResponse({
    description: `${MEMBER_NOT_FOUND.description} Também para participação que não está aprovada.`,
  })
  @ApiConflictResponse({
    description: `${NOT_OPEN.description} Ou: Quem organiza não pode ser removido.`,
  })
  remove(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Param('membershipId') membershipId: string,
  ): Promise<void> {
    return this.members.remove(user, id, membershipId);
  }

  @Post(':id/leave')
  @HttpCode(204)
  @ApiNoContentResponse({
    description:
      'Participação apagada, com o aviso a quem organiza: a pessoa pode voltar pelo link como quem nunca participou.',
  })
  @ApiNotFoundResponse(NOT_FOUND)
  @ApiConflictResponse({
    description: `${NOT_OPEN.description} Ou, a quem organiza: Transfira a organização antes de sair do grupo.`,
  })
  leave(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
  ): Promise<void> {
    return this.members.leave(user, id);
  }

  @Post(':id/transfer')
  @HttpCode(200)
  @ApiOkResponse({
    description:
      'A pessoa escolhida passa a organizar o grupo, com o aviso a ela; quem organizava continua como participante. Devolve o grupo visto por quem transferiu.',
  })
  @ApiBadRequestResponse({ description: '`membershipId` ausente.' })
  @ApiForbiddenResponse(ORGANIZER_ONLY)
  @ApiNotFoundResponse({
    description: `${MEMBER_NOT_FOUND.description} Também para participação que não está aprovada ou de quem já organiza.`,
  })
  @ApiConflictResponse({
    description: 'Grupo encerrado não pode ser alterado.',
  })
  transfer(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body() body: TransferDto,
  ): Promise<GroupDetail> {
    return this.members.transfer(user, id, body.membershipId);
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
