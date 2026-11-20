import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { EmailModule } from '../email/email.module.js';
import { RateLimitModule } from '../rate-limit/rate-limit.module.js';
import { PasswordChangeService } from './password-change.service.js';
import { User } from './user.entity.js';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';

@Module({
  imports: [
    AuthModule,
    EmailModule,
    RateLimitModule,
    TypeOrmModule.forFeature([User]),
  ],
  controllers: [UsersController],
  providers: [UsersService, PasswordChangeService],
  exports: [TypeOrmModule],
})
export class UsersModule {}
