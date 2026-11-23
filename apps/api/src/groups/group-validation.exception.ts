import { BadRequestException } from '@nestjs/common';

// 400 com a mensagem de cada campo, que o site mostra embaixo do campo.
export class GroupValidationException extends BadRequestException {
  constructor(fields: Partial<Record<string, string>>) {
    super({
      statusCode: 400,
      message: 'Dados inválidos.',
      error: 'Bad Request',
      fields,
    });
  }
}
