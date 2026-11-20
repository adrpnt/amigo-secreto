import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSessionTable1795186194037 implements MigrationInterface {
  name = 'CreateSessionTable1795186194037';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "session" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "userId" uuid NOT NULL, "tokenHash" character(64) NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "lastUsedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "UQ_ff3b5bfd0767bd32942e5ccaad0" UNIQUE ("tokenHash"), CONSTRAINT "PK_f55da76ac1c3ac420f444d2ff11" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3d2f174ef04fb312fdebd0ddc5" ON "session"  ("userId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "session" ADD CONSTRAINT "FK_3d2f174ef04fb312fdebd0ddc53" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "session" DROP CONSTRAINT "FK_3d2f174ef04fb312fdebd0ddc53"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3d2f174ef04fb312fdebd0ddc5"`,
    );
    await queryRunner.query(`DROP TABLE "session"`);
  }
}
