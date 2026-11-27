import type { MigrationInterface, QueryRunner } from 'typeorm';

// Grupos criados antes do lembrete de sortear ganham o deles: um job
// draw.reminder na hora do sorteio previsto, com a data no mesmo formato do
// toISOString que o app grava.
export class ScheduleExistingDrawReminders1795730775303 implements MigrationInterface {
  name = 'ScheduleExistingDrawReminders1795730775303';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO job (type, payload, "runAt", status, attempts)
       SELECT 'draw.reminder',
         jsonb_build_object(
           'groupId', id,
           'drawScheduledAt', to_char("drawScheduledAt" AT TIME ZONE 'UTC',
             'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
         ),
         "drawScheduledAt", 'PENDING', 0
       FROM "group"
       WHERE status = 'OPEN' AND "drawScheduledAt" > now()`,
    );
  }

  // Nada a desfazer: depois do deploy o app também agenda lembretes, e
  // apagar os pendentes tiraria o lembrete de grupos novos.
  public async down(): Promise<void> {}
}
