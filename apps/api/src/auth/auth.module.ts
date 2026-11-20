import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module.js';
import { AuthController } from './auth.controller.js';
import { SessionGuard } from './guards/session.guard.js';
import { Session } from './session.entity.js';
import { SessionsService } from './sessions.service.js';

@Module({
  imports: [UsersModule, TypeOrmModule.forFeature([Session])],
  controllers: [AuthController],
  providers: [SessionsService, { provide: APP_GUARD, useClass: SessionGuard }],
  exports: [SessionsService],
})
export class AuthModule {}
