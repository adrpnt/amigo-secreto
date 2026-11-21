import type {
  GroupDetail,
  MyGroupsResponse,
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
  Put,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { GroupInputDto } from './dto/group-input.dto.js';
import { GroupsService } from './groups.service.js';

const INVALID_FIELDS = {
  description:
    'Algum campo viola uma regra; `fields` traz a mensagem de cada campo.',
  schema: {
    type: 'object',
    properties: {
      statusCode: { type: 'number', example: 400 },
      message: { type: 'string', example: 'Dados inválidos.' },
      error: { type: 'string', example: 'Bad Request' },
      fields: {
        type: 'object',
        additionalProperties: { type: 'string' },
        example: { name: 'Informe um nome de 1 a 80 caracteres.' },
      },
    },
  },
};
const NO_SESSION = { description: 'Sem sessão válida.' };
const NOT_FOUND = {
  description:
    'Grupo não encontrado: id inexistente, id que não é UUID ou pessoa sem participação aprovada.',
};
const ORGANIZER_ONLY = {
  description: 'Só quem organiza pode alterar o grupo.',
};

@ApiTags('groups')
@ApiUnauthorizedResponse(NO_SESSION)
@Controller('groups')
export class GroupsController {
  constructor(private readonly groups: GroupsService) {}

  @Post()
  @ApiCreatedResponse({
    description: 'Grupo criado, ABERTO, com quem cria como organizadora.',
  })
  @ApiBadRequestResponse(INVALID_FIELDS)
  @ApiTooManyRequestsResponse({
    description:
      'Mais de 20 grupos criados na hora; `Retry-After` em segundos.',
  })
  create(
    @CurrentUser() user: SessionUser,
    @Body() body: GroupInputDto,
  ): Promise<GroupDetail> {
    return this.groups.create(user, body);
  }

  @Get()
  @ApiOkResponse({
    description:
      'Grupos de que a pessoa participa: ativos (ABERTO e SORTEADO) e encerrados, dos mais novos para os mais antigos.',
  })
  listMine(@CurrentUser() user: SessionUser): Promise<MyGroupsResponse> {
    return this.groups.listMine(user.id);
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Dados do grupo.' })
  @ApiNotFoundResponse(NOT_FOUND)
  get(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
  ): Promise<GroupDetail> {
    return this.groups.get(user.id, id);
  }

  @Put(':id')
  @ApiOkResponse({
    description: 'Grupo com todos os campos substituídos; null apaga.',
  })
  @ApiBadRequestResponse(INVALID_FIELDS)
  @ApiForbiddenResponse(ORGANIZER_ONLY)
  @ApiNotFoundResponse(NOT_FOUND)
  @ApiConflictResponse({ description: 'Grupo encerrado não pode ser editado.' })
  update(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body() body: GroupInputDto,
  ): Promise<GroupDetail> {
    return this.groups.update(user, id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiNoContentResponse({
    description:
      'Grupo e participações apagados; os outros participantes aprovados recebem um aviso.',
  })
  @ApiForbiddenResponse(ORGANIZER_ONLY)
  @ApiNotFoundResponse(NOT_FOUND)
  remove(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
  ): Promise<void> {
    return this.groups.remove(user, id);
  }

  @Post(':id/close')
  @HttpCode(200)
  @ApiOkResponse({
    description:
      'Grupo ENCERRADO; os outros participantes aprovados recebem um aviso.',
  })
  @ApiForbiddenResponse(ORGANIZER_ONLY)
  @ApiNotFoundResponse(NOT_FOUND)
  @ApiConflictResponse({
    description: 'Só um grupo sorteado pode ser encerrado.',
  })
  close(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
  ): Promise<GroupDetail> {
    return this.groups.close(user, id);
  }
}
