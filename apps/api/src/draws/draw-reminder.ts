import type { EntityManager } from 'typeorm';
import { Job } from '../jobs/job.entity.js';

export const DRAW_REMINDER = 'draw.reminder';

// A data do agendamento vai junto: na hora, o handler confere se o sorteio
// previsto ainda é o mesmo.
export type DrawReminderPayload = { groupId: string; drawScheduledAt: string };

const DELETE_PENDING_SQL = `
  DELETE FROM job
  WHERE type = $1 AND status = 'PENDING' AND payload->>'groupId' = $2`;

// Troca o lembrete pendente do grupo pelo da data nova; sem data, só apaga.
// Recebe o manager da transação de quem chama, para o GroupsModule não
// depender do DrawsModule.
export async function scheduleDrawReminder(
  manager: EntityManager,
  groupId: string,
  at: Date | null,
): Promise<void> {
  await manager.query(DELETE_PENDING_SQL, [DRAW_REMINDER, groupId]);
  if (!at) return;
  const payload: DrawReminderPayload = {
    groupId,
    drawScheduledAt: at.toISOString(),
  };
  await manager.insert(Job, {
    type: DRAW_REMINDER,
    payload,
    runAt: at,
    status: 'PENDING',
    attempts: 0,
  });
}
