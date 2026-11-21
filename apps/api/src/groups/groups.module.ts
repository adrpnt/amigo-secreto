import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailModule } from '../email/email.module.js';
import { RateLimitModule } from '../rate-limit/rate-limit.module.js';
import { GroupAccess } from './group-access.service.js';
import { Group } from './group.entity.js';
import { GroupsController } from './groups.controller.js';
import { GroupsService } from './groups.service.js';
import { Membership } from './membership.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Group, Membership]),
    EmailModule,
    RateLimitModule,
  ],
  controllers: [GroupsController],
  providers: [GroupAccess, GroupsService],
  exports: [TypeOrmModule, GroupAccess],
})
export class GroupsModule {}
