import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Group } from './group.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Group])],
  exports: [TypeOrmModule],
})
export class GroupsModule {}
