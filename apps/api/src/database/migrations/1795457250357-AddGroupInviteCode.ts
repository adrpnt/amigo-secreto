import type { MigrationInterface, QueryRunner } from 'typeorm';
import { generateInviteCode } from '../../invites/invite-code.js';

export class AddGroupInviteCode1795457250357 implements MigrationInterface {
  name = 'AddGroupInviteCode1795457250357';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "group" ADD "inviteCode" character varying(10)`,
    );

    // Grupos que já existiam ganham um código antes do NOT NULL.
    const groups = (await queryRunner.query(`SELECT id FROM "group"`)) as {
      id: string;
    }[];
    const used = new Set<string>();
    for (const { id } of groups) {
      let code = generateInviteCode();
      while (used.has(code)) code = generateInviteCode();
      used.add(code);
      await queryRunner.query(
        `UPDATE "group" SET "inviteCode" = $1 WHERE id = $2`,
        [code, id],
      );
    }

    await queryRunner.query(
      `ALTER TABLE "group" ALTER COLUMN "inviteCode" SET NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_4f349bf7a69113fc48c2ac5271" ON "group"  ("inviteCode") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_4f349bf7a69113fc48c2ac5271"`,
    );
    await queryRunner.query(`ALTER TABLE "group" DROP COLUMN "inviteCode"`);
  }
}
