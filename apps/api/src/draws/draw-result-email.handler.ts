import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import type { EnvironmentVariables } from '../config/env.validation.js';
import { EmailSender } from '../email/email-sender.js';
import type { Job } from '../jobs/job.entity.js';
import type { JobHandler } from '../jobs/job-handler.registry.js';
import { drawResultEmail } from './draw-emails.js';
import type { DrawResultEmailPayload } from './draws.service.js';

// O par da rodada ativa, com quem tira, quem é tirado e quem organiza agora.
// Rodada cancelada ou grupo excluído não têm mais o par.
const RESULT_SQL = `
  SELECT g.id AS "groupId", g.name AS "groupName",
    giver.email AS "giverEmail", receiver.name AS "receiverName",
    owner.name AS "organizerName"
  FROM assignment a
  JOIN draw d ON d.id = a."drawId" AND d.status = 'ACTIVE'
  JOIN "group" g ON g.id = d."groupId"
  JOIN "user" giver ON giver.id = a."giverUserId"
  JOIN "user" receiver ON receiver.id = a."receiverUserId"
  JOIN "user" owner ON owner.id = g."ownerId"
  WHERE a."drawId" = $1 AND a."giverUserId" = $2`;

type ResultRow = {
  groupId: string;
  groupName: string;
  giverEmail: string;
  receiverName: string;
  organizerName: string;
};

// Monta o e-mail na hora do envio: o nome sorteado nunca fica na fila. Sem
// par, termina sem enviar.
@Injectable()
export class DrawResultEmailHandler implements JobHandler {
  constructor(
    private readonly dataSource: DataSource,
    private readonly sender: EmailSender,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  async handle(job: Job): Promise<void> {
    const { drawId, giverUserId } = job.payload as DrawResultEmailPayload;
    const [row] = await this.dataSource.query<ResultRow[]>(RESULT_SQL, [
      drawId,
      giverUserId,
    ]);
    if (!row) return;

    await this.sender.send(
      drawResultEmail({
        to: row.giverEmail,
        organizerName: row.organizerName,
        groupName: row.groupName,
        groupId: row.groupId,
        receiverName: row.receiverName,
        webUrl: this.config.get('WEB_URL', { infer: true }),
      }),
      job.id,
    );
  }
}
