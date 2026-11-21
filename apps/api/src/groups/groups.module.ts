import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Group } from './group.entity.js';
import { Membership } from './membership.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Group, Membership])],
  exports: [TypeOrmModule],
})
export class GroupsModule {}
