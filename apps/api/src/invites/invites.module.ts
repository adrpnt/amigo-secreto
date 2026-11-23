import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RateLimitModule } from '../rate-limit/rate-limit.module.js';
import { EmailInvite } from './email-invite.entity.js';
import { InvitesController } from './invites.controller.js';
import { InvitesService } from './invites.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([EmailInvite]), RateLimitModule],
  controllers: [InvitesController],
  providers: [InvitesService],
})
export class InvitesModule {}
