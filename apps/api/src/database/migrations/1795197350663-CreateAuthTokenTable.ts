import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuthTokenTable1795197350663 implements MigrationInterface {
  name = 'CreateAuthTokenTable1795197350663';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."auth_token_type_enum" AS ENUM('email_verification', 'password_reset', 'email_change')`,
    );
    await queryRunner.query(
      `CREATE TABLE "auth_token" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "userId" uuid NOT NULL, "type" "public"."auth_token_type_enum" NOT NULL, "tokenHash" character(64) NOT NULL, "newEmail" character varying(254), "next" character varying, "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL, "usedAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_7634f50cfa7ac8e4e4d5f31e356" UNIQUE ("tokenHash"), CONSTRAINT "PK_4572ff5d1264c4a523f01aa86a0" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5a326267f11b44c0d62526bc71" ON "auth_token"  ("userId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "auth_token" ADD CONSTRAINT "FK_5a326267f11b44c0d62526bc718" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "auth_token" DROP CONSTRAINT "FK_5a326267f11b44c0d62526bc718"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5a326267f11b44c0d62526bc71"`,
    );
    await queryRunner.query(`DROP TABLE "auth_token"`);
    await queryRunner.query(`DROP TYPE "public"."auth_token_type_enum"`);
  }
}
