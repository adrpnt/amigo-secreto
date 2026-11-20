import {
  Controller,
  Get,
  Headers,
  Module,
  Param,
  Post,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { type CookieResponse, parseCookies } from '../../src/auth/cookies.js';
import { Session } from '../../src/auth/session.entity.js';
import {
  SESSION_COOKIE,
  SessionsService,
} from '../../src/auth/sessions.service.js';
import { validateEnvironment } from '../../src/config/env.validation.js';
import { DatabaseModule } from '../../src/database/database.module.js';
import { User } from '../../src/users/user.entity.js';

@Controller('fixtures/sessions')
class SessionsFixtureController {
  constructor(private readonly sessions: SessionsService) {}

  @Post(':userId')
  async open(
    @Param('userId') userId: string,
    @Res({ passthrough: true }) response: CookieResponse,
  ): Promise<{ sessionId: string }> {
    const session = await this.sessions.create(userId, response);
    return { sessionId: session.id };
  }

  @Get('current')
  async current(
    @Headers('cookie') cookie: string | undefined,
    @Res({ passthrough: true }) response: CookieResponse,
  ): Promise<{ sessionId: string; userId: string }> {
    const token = parseCookies(cookie).get(SESSION_COOKIE);
    const resolved = await this.sessions.resolve(token);
    if (!resolved || !token) throw new UnauthorizedException();
    await this.sessions.touch(resolved.session, response, token);
    return { sessionId: resolved.session.id, userId: resolved.user.id };
  }
}

// O ConfigModule valida o ambiente quando o forRoot é chamado: cada chamada
// monta o módulo com o ambiente do momento.
export function createSessionsFixtureModule() {
  @Module({
    imports: [
      ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
      DatabaseModule,
      TypeOrmModule.forFeature([Session, User]),
    ],
    controllers: [SessionsFixtureController],
    providers: [SessionsService],
  })
  class SessionsFixtureModule {}
  return SessionsFixtureModule;
}
