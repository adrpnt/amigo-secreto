import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailModule } from '../email/email.module.js';
import { GroupsModule } from '../groups/groups.module.js';
import { RateLimitModule } from '../rate-limit/rate-limit.module.js';
import { EmailInvite } from './email-invite.entity.js';
import { GroupMembersController } from './group-members.controller.js';
import { InvitesController } from './invites.controller.js';
import { InvitesService } from './invites.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([EmailInvite]),
    EmailModule,
    GroupsModule,
    RateLimitModule,
  ],
  controllers: [InvitesController, GroupMembersController],
  providers: [InvitesService],
})
export class InvitesModule {}
