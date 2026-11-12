import {
  BadRequestException,
  Controller,
  Get,
  InternalServerErrorException,
  Module,
  NotFoundException,
} from '@nestjs/common';

export const INTERNAL_DETAIL = 'senha do banco recusada em db.interno:5432';

@Controller('fixtures/errors')
class ErrorsFixtureController {
  @Get('unhandled')
  unhandled(): never {
    throw new Error(INTERNAL_DETAIL);
  }

  @Get('internal-with-message')
  internalWithMessage(): never {
    throw new InternalServerErrorException(INTERNAL_DETAIL);
  }

  @Get('bad-request')
  badRequest(): never {
    throw new BadRequestException('Pedido inválido');
  }

  @Get('not-found')
  notFound(): never {
    throw new NotFoundException('Grupo não encontrado');
  }
}

@Module({ controllers: [ErrorsFixtureController] })
export class ErrorsFixtureModule {}
