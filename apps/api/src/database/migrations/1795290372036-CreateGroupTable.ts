import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateGroupTable1795290372036 implements MigrationInterface {
  name = 'CreateGroupTable1795290372036';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "group" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "name" character varying(80) NOT NULL, "description" character varying(1000), "ownerId" uuid NOT NULL, "giftMinValue" integer, "giftMaxValue" integer, "drawScheduledAt" TIMESTAMP WITH TIME ZONE, "eventAt" TIMESTAMP WITH TIME ZONE, "eventLocation" character varying(200), "isOnlineEvent" boolean NOT NULL DEFAULT false, "requiresApproval" boolean NOT NULL DEFAULT false, "status" character varying(10) NOT NULL DEFAULT 'OPEN', "closedAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_07d89365e0c822479d3b6b7562" CHECK (("status" = 'CLOSED') = ("closedAt" IS NOT NULL)), CONSTRAINT "CHK_b96b68a20b0eb4087e0dd6b03c" CHECK ("giftMinValue" <= "giftMaxValue"), CONSTRAINT "CHK_32193e651743aed3788885087b" CHECK (("giftMinValue" IS NULL) = ("giftMaxValue" IS NULL)), CONSTRAINT "CHK_a2b2a0d4438574263951ee7b83" CHECK ("status" IN ('OPEN', 'DRAWN', 'CLOSED')), CONSTRAINT "PK_256aa0fda9b1de1a73ee0b7106b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_af997e6623c9a0e27c24112698" ON "group"  ("ownerId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "group" ADD CONSTRAINT "FK_af997e6623c9a0e27c241126988" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "group" DROP CONSTRAINT "FK_af997e6623c9a0e27c241126988"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_af997e6623c9a0e27c24112698"`,
    );
    await queryRunner.query(`DROP TABLE "group"`);
  }
}
