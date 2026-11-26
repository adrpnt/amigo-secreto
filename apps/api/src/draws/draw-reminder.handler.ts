import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import type { EnvironmentVariables } from '../config/env.validation.js';
import { EmailService } from '../email/email.service.js';
import { Group } from '../groups/group.entity.js';
import type { Job } from '../jobs/job.entity.js';
import type { JobHandler } from '../jobs/job-handler.registry.js';
import { BusinessEventsService } from '../observability/business-events.service.js';
import { User } from '../users/user.entity.js';
import { drawReminderEmail } from './draw-emails.js';
import type { DrawReminderPayload } from './draw-reminder.js';

// Na hora do sorteio previsto, avisa quem organiza o grupo agora. Grupo
// excluído, fora de ABERTO ou com outra data termina sem enviar. A trava do
// grupo faz um sorteio simultâneo esperar: ou o aviso entra antes, ou o
// handler já encontra o grupo SORTEADO.
@Injectable()
export class DrawReminderHandler implements JobHandler {
  constructor(
    private readonly dataSource: DataSource,
    private readonly email: EmailService,
    private readonly events: BusinessEventsService,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  async handle(job: Job): Promise<void> {
    const { groupId, drawScheduledAt } = job.payload as DrawReminderPayload;
    const webUrl: string = this.config.get('WEB_URL', { infer: true });

    const sent = await this.dataSource.transaction(async (manager) => {
      const group = await manager.getRepository(Group).findOne({
        where: { id: groupId },
        lock: { mode: 'pessimistic_write' },
      });
      if (
        !group ||
        group.status !== 'OPEN' ||
        group.drawScheduledAt?.toISOString() !== drawScheduledAt
      ) {
        return false;
      }
      const organizer = await manager
        .getRepository(User)
        .findOneByOrFail({ id: group.ownerId });
      await this.email.enqueue(
        drawReminderEmail({
          to: organizer.email,
          groupName: group.name,
          groupId,
          webUrl,
        }),
        { manager },
      );
      return true;
    });

    if (sent) this.events.record('draw.reminder_sent', { groupId });
  }
}
