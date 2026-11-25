import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Assignment } from './assignment.entity.js';
import { Draw } from './draw.entity.js';
import { Exclusion } from './exclusion.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Exclusion, Draw, Assignment])],
})
export class DrawsModule {}
