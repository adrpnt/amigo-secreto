import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupsModule } from '../groups/groups.module.js';
import { Assignment } from './assignment.entity.js';
import { Draw } from './draw.entity.js';
import { DrawsController } from './draws.controller.js';
import { Exclusion } from './exclusion.entity.js';
import { ExclusionsService } from './exclusions.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Exclusion, Draw, Assignment]),
    GroupsModule,
  ],
  controllers: [DrawsController],
  providers: [ExclusionsService],
})
export class DrawsModule {}
