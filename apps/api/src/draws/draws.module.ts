import { Module, type OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailModule } from '../email/email.module.js';
import { GroupsModule } from '../groups/groups.module.js';
import { JobHandlerRegistry } from '../jobs/job-handler.registry.js';
import { JobsModule } from '../jobs/jobs.module.js';
import { Assignment } from './assignment.entity.js';
import { DRAW_REMINDER } from './draw-reminder.js';
import { DrawReminderHandler } from './draw-reminder.handler.js';
import { DrawResultEmailHandler } from './draw-result-email.handler.js';
import { Draw } from './draw.entity.js';
import { DrawsController } from './draws.controller.js';
import { DRAW_RESULT_EMAIL, DrawsService } from './draws.service.js';
import { Exclusion } from './exclusion.entity.js';
import { ExclusionsService } from './exclusions.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Exclusion, Draw, Assignment]),
    EmailModule,
    GroupsModule,
    JobsModule,
  ],
  controllers: [DrawsController],
  providers: [
    DrawsService,
    ExclusionsService,
    DrawResultEmailHandler,
    DrawReminderHandler,
  ],
})
export class DrawsModule implements OnModuleInit {
  constructor(
    private readonly handlers: JobHandlerRegistry,
    private readonly resultEmail: DrawResultEmailHandler,
    private readonly reminder: DrawReminderHandler,
  ) {}

  onModuleInit(): void {
    this.handlers.register(DRAW_RESULT_EMAIL, this.resultEmail);
    this.handlers.register(DRAW_REMINDER, this.reminder);
  }
}
