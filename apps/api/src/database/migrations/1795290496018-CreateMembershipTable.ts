import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMembershipTable1795290496018 implements MigrationInterface {
  name = 'CreateMembershipTable1795290496018';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "membership" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "groupId" uuid NOT NULL, "userId" uuid NOT NULL, "status" character varying(10) NOT NULL, "joinedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_9c7d697a4844cf8b931988b24f4" UNIQUE ("groupId", "userId"), CONSTRAINT "CHK_23e4e557b04007e0288971adb3" CHECK ("status" IN ('PENDING', 'APPROVED', 'REJECTED')), CONSTRAINT "PK_83c1afebef3059472e7c37e8de8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_eef2d9d9c70cd13bed868afedf" ON "membership"  ("userId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "membership" ADD CONSTRAINT "FK_8bc1674087575acecf0a648fc91" FOREIGN KEY ("groupId") REFERENCES "group"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "membership" ADD CONSTRAINT "FK_eef2d9d9c70cd13bed868afedf4" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "membership" DROP CONSTRAINT "FK_eef2d9d9c70cd13bed868afedf4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "membership" DROP CONSTRAINT "FK_8bc1674087575acecf0a648fc91"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_eef2d9d9c70cd13bed868afedf"`,
    );
    await queryRunner.query(`DROP TABLE "membership"`);
  }
}
