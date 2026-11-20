import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator.js';
import { ConfirmEmailChangeDto } from './dto/confirm-email-change.dto.js';
import { EmailChangeService } from './email-change.service.js';

// Fica no UsersModule, que enxerga o AuthModule; o caminho segue o das
// outras rotas de link por e-mail.
@Controller('auth/email/change')
export class EmailChangeController {
  constructor(private readonly emailChange: EmailChangeService) {}

  // O token prova a posse do e-mail novo; a rota não abre nem encerra sessão.
  @Public()
  @Post('confirm')
  @HttpCode(200)
  confirm(@Body() body: ConfirmEmailChangeDto): Promise<{ email: string }> {
    return this.emailChange.confirm(body.token);
  }
}
