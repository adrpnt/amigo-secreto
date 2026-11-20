import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserTable1795180059667 implements MigrationInterface {
  name = 'CreateUserTable1795180059667';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "user" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "name" character varying(80) NOT NULL, "email" character varying(254) NOT NULL, "passwordHash" character varying, "googleId" character varying(255), "avatarUrl" character varying, "emailVerifiedAt" TIMESTAMP WITH TIME ZONE, "termsVersion" character varying(20) NOT NULL, "termsAcceptedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "marketingOptIn" boolean NOT NULL DEFAULT false, "marketingOptInAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22" UNIQUE ("email"), CONSTRAINT "UQ_470355432cc67b2c470c30bef7c" UNIQUE ("googleId"), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "user"`);
  }
}
