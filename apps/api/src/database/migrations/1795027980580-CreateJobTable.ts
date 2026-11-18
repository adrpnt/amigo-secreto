import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateJobTable1795027980580 implements MigrationInterface {
  name = 'CreateJobTable1795027980580';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."job_status_enum" AS ENUM('PENDING', 'RUNNING', 'DONE', 'FAILED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "job" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "type" character varying(100) NOT NULL, "payload" jsonb NOT NULL, "runAt" TIMESTAMP WITH TIME ZONE NOT NULL, "status" "public"."job_status_enum" NOT NULL DEFAULT 'PENDING', "attempts" integer NOT NULL DEFAULT '0', "lastError" character varying(500), "lockedAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_98ab1c14ff8d1cf80d18703b92f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e55338ef6f4c8a4c82fcb95787" ON "job"  ("status", "runAt") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e55338ef6f4c8a4c82fcb95787"`,
    );
    await queryRunner.query(`DROP TABLE "job"`);
    await queryRunner.query(`DROP TYPE "public"."job_status_enum"`);
  }
}
