import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupAccess } from './group-access.service.js';
import { Group } from './group.entity.js';
import { Membership } from './membership.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Group, Membership])],
  providers: [GroupAccess],
  exports: [TypeOrmModule, GroupAccess],
})
export class GroupsModule {}
