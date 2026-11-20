import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailModule } from '../email/email.module.js';
import { RateLimitModule } from '../rate-limit/rate-limit.module.js';
import { UsersModule } from '../users/users.module.js';
import { AuthToken } from './auth-token.entity.js';
import { AuthTokensService } from './auth-tokens.service.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { EmailVerificationService } from './email-verification.service.js';
import { CsrfGuard } from './guards/csrf.guard.js';
import { SessionGuard } from './guards/session.guard.js';
import { LoginService } from './login.service.js';
import { PasswordHasher } from './password-hasher.js';
import { PasswordResetService } from './password-reset.service.js';
import { Session } from './session.entity.js';
import { SessionsService } from './sessions.service.js';

@Module({
  imports: [
    UsersModule,
    EmailModule,
    RateLimitModule,
    TypeOrmModule.forFeature([Session, AuthToken]),
  ],
  controllers: [AuthController],
  // Os guards globais rodam na ordem em que são registrados.
  providers: [
    SessionsService,
    AuthTokensService,
    PasswordHasher,
    AuthService,
    EmailVerificationService,
    LoginService,
    PasswordResetService,
    { provide: APP_GUARD, useClass: SessionGuard },
    { provide: APP_GUARD, useClass: CsrfGuard },
  ],
  exports: [SessionsService],
})
export class AuthModule {}
