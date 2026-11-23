import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEmailInviteTable1795461402805 implements MigrationInterface {
  name = 'CreateEmailInviteTable1795461402805';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "email_invite" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "groupId" uuid NOT NULL, "email" character varying(254) NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_2704d29972304ae8bf0f649c6f6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f9783c93a21b3d5d1c58d093e2" ON "email_invite"  ("groupId", "createdAt") `,
    );
    await queryRunner.query(
      `ALTER TABLE "email_invite" ADD CONSTRAINT "FK_f8051f808dde449f2fa7c71faad" FOREIGN KEY ("groupId") REFERENCES "group"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "email_invite" DROP CONSTRAINT "FK_f8051f808dde449f2fa7c71faad"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f9783c93a21b3d5d1c58d093e2"`,
    );
    await queryRunner.query(`DROP TABLE "email_invite"`);
  }
}
