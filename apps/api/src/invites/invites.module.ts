import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailInvite } from './email-invite.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([EmailInvite])],
})
export class InvitesModule {}
