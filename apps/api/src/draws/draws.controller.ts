import type {
  DrawPanel,
  DrawResult,
  ExclusionPair,
  ExclusionsResponse,
  SessionUser,
} from '@amigo-secreto/shared';
import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
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
  ApiTooManyRequestsResponse,
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

  @Post(':id/draw')
  @ApiCreatedResponse({
    description:
      'Rodada ativa criada com um par por participante aprovado, grupo SORTEADO e um e-mail de resultado por participante na fila. Devolve só a data, nunca um par sorteado.',
  })
  @ApiForbiddenResponse(ORGANIZER_ONLY)
  @ApiNotFoundResponse(NOT_FOUND)
  @ApiConflictResponse({
    description:
      'A primeira condição que falha, nesta ordem: Este grupo já fez o sorteio. ou Grupo encerrado não pode ser alterado.; O sorteio precisa de pelo menos 3 participantes aprovados.; Aprove ou recuse os pedidos pendentes antes do sorteio.; As restrições não permitem um sorteio válido., com `pairsToReview`.',
  })
  @ApiTooManyRequestsResponse({
    description:
      'O grupo já teve 5 sorteios nas últimas 24 horas; `Retry-After` em segundos.',
  })
  perform(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
  ): Promise<{ drawnAt: string }> {
    return this.draws.perform(user.id, id);
  }

  @Delete(':id/draw')
  @HttpCode(204)
  @ApiNoContentResponse({
    description:
      'Rodada cancelada com a data, pares sorteados apagados, grupo ABERTO e um aviso na fila para cada participante da rodada, menos quem cancelou. E-mails de resultado ainda na fila não saem.',
  })
  @ApiForbiddenResponse(ORGANIZER_ONLY)
  @ApiNotFoundResponse(NOT_FOUND)
  @ApiConflictResponse({
    description:
      'Este grupo ainda não fez o sorteio. (grupo ABERTO) ou Grupo encerrado não pode ser alterado. (grupo ENCERRADO)',
  })
  cancel(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
  ): Promise<void> {
    return this.draws.cancel(user.id, id);
  }

  @Get(':id/draw/result')
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({
    description:
      'Quem a pessoa que pede tirou na rodada ativa, com o nome atual. Só o próprio par; nunca o de outra pessoa.',
  })
  @ApiNotFoundResponse({
    description: `${NOT_FOUND.description} Ou Sorteio não encontrado.: o grupo não tem rodada ativa.`,
  })
  result(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
  ): Promise<DrawResult> {
    return this.draws.result(user.id, id);
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
