import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRateLimitTable1795185209503 implements MigrationInterface {
  name = 'CreateRateLimitTable1795185209503';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "rate_limit" ("key" character varying(300) NOT NULL, "windowStart" TIMESTAMP WITH TIME ZONE NOT NULL, "count" integer NOT NULL, CONSTRAINT "PK_e6c0c0608decdf78e4d4b263397" PRIMARY KEY ("key"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "rate_limit"`);
  }
}
