import type {
  DrawPanel,
  ExclusionPair,
  ExclusionsResponse,
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
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { DrawsService } from './draws.service.js';
import { ExclusionInputDto } from './dto/exclusion-input.dto.js';
import { ExclusionsService } from './exclusions.service.js';

const NOT_FOUND = {
  description:
    'Grupo não encontrado: id inexistente, id que não é UUID ou pessoa sem participação aprovada.',
};
const ORGANIZER_ONLY = {
  description: 'Só quem organiza pode alterar o grupo.',
};
const LOCKED = {
  description:
    'Para mudar as restrições, cancele o sorteio. (grupo SORTEADO) ou Grupo encerrado não pode ser alterado. (grupo ENCERRADO)',
};

@ApiTags('draws')
@ApiUnauthorizedResponse({ description: 'Sem sessão válida.' })
@Controller('groups')
export class DrawsController {
  constructor(
    private readonly draws: DrawsService,
    private readonly exclusions: ExclusionsService,
  ) {}

  @Get(':id/draw')
  @ApiOkResponse({
    description:
      'Painel de quem organiza: status, data da rodada ativa, aprovados, pendentes, se as restrições permitem o sorteio e os pares a revisar. Nunca traz par sorteado.',
  })
  @ApiForbiddenResponse(ORGANIZER_ONLY)
  @ApiNotFoundResponse(NOT_FOUND)
  panel(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
  ): Promise<DrawPanel> {
    return this.draws.panel(user.id, id);
  }

  @Get(':id/exclusions')
  @ApiOkResponse({
    description:
      'Participantes aprovados e pares de restrição, em ordem de nome; pessoas pela participação, sem id de pessoa.',
  })
  @ApiForbiddenResponse(ORGANIZER_ONLY)
  @ApiNotFoundResponse(NOT_FOUND)
  listExclusions(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
  ): Promise<ExclusionsResponse> {
    return this.exclusions.list(user.id, id);
  }

  @Post(':id/exclusions')
  @ApiCreatedResponse({
    description:
      'Par gravado; vale nos dois sentidos. `a` é quem vem primeiro na ordem de nome.',
  })
  @ApiBadRequestResponse({
    description:
      'Falta uma das pessoas, as duas são a mesma ou o par já existe; `fields.a` traz a mensagem.',
  })
  @ApiForbiddenResponse(ORGANIZER_ONLY)
  @ApiNotFoundResponse({
    description: `${NOT_FOUND.description} Ou Participante não encontrado.: uma das participações não é aprovada neste grupo.`,
  })
  @ApiConflictResponse(LOCKED)
  addExclusion(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body() body: ExclusionInputDto,
  ): Promise<ExclusionPair> {
    return this.exclusions.add(user.id, id, body);
  }

  @Delete(':id/exclusions/:pairId')
  @HttpCode(204)
  @ApiNoContentResponse({
    description: 'Par apagado; também quando ele não existe.',
  })
  @ApiForbiddenResponse(ORGANIZER_ONLY)
  @ApiNotFoundResponse(NOT_FOUND)
  @ApiConflictResponse(LOCKED)
  removeExclusion(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Param('pairId') pairId: string,
  ): Promise<void> {
    return this.exclusions.remove(user.id, id, pairId);
  }
}
