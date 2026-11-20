import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module.js';
import { AuthToken } from './auth-token.entity.js';
import { AuthTokensService } from './auth-tokens.service.js';
import { AuthController } from './auth.controller.js';
import { CsrfGuard } from './guards/csrf.guard.js';
import { SessionGuard } from './guards/session.guard.js';
import { Session } from './session.entity.js';
import { SessionsService } from './sessions.service.js';

@Module({
  imports: [UsersModule, TypeOrmModule.forFeature([Session, AuthToken])],
  controllers: [AuthController],
  // Os guards globais rodam na ordem em que são registrados.
  providers: [
    SessionsService,
    AuthTokensService,
    { provide: APP_GUARD, useClass: SessionGuard },
    { provide: APP_GUARD, useClass: CsrfGuard },
  ],
  exports: [SessionsService],
})
export class AuthModule {}
