import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDrawTables1795609366694 implements MigrationInterface {
  name = 'CreateDrawTables1795609366694';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "draw" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "groupId" uuid NOT NULL, "status" character varying(10) NOT NULL, "singleCycle" boolean NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "cancelledAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "CHK_72ce4c81ba3f2674f8f12fd946" CHECK (("status" = 'CANCELLED') = ("cancelledAt" IS NOT NULL)), CONSTRAINT "CHK_c025388669719127d016919ed2" CHECK ("status" IN ('ACTIVE', 'CANCELLED')), CONSTRAINT "PK_93d305b8405e4b975c54d609dc8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1d14e6f99a7b180cc3d16b9789" ON "draw"  ("groupId", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_3bb4feb3ac05ec3369e1e3353e" ON "draw"  ("groupId") WHERE "status" = 'ACTIVE'`,
    );
    await queryRunner.query(
      `CREATE TABLE "assignment" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "drawId" uuid NOT NULL, "giverUserId" uuid NOT NULL, "receiverUserId" uuid NOT NULL, CONSTRAINT "UQ_f35c205cbef7b926e5887785fd3" UNIQUE ("drawId", "receiverUserId"), CONSTRAINT "UQ_3951e16130fbd448715777eea13" UNIQUE ("drawId", "giverUserId"), CONSTRAINT "CHK_2a9ab5d9558271a5068def2c18" CHECK ("giverUserId" <> "receiverUserId"), CONSTRAINT "PK_43c2f5a3859f54cedafb270f37e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "exclusion" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "groupId" uuid NOT NULL, "userAId" uuid NOT NULL, "userBId" uuid NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_9091954269c06d542072c2d9665" UNIQUE ("groupId", "userAId", "userBId"), CONSTRAINT "CHK_db5b1facd6ba73332973e99c27" CHECK ("userAId" < "userBId"), CONSTRAINT "PK_7f8dcde2e607a96d66dce002e74" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "draw" ADD CONSTRAINT "FK_8103de963ae5f841445d7dbd7ca" FOREIGN KEY ("groupId") REFERENCES "group"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "assignment" ADD CONSTRAINT "FK_291d453363d9d3a5b6a603c8bb1" FOREIGN KEY ("drawId") REFERENCES "draw"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "assignment" ADD CONSTRAINT "FK_925feb3e4f94138bc168c033c04" FOREIGN KEY ("giverUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "assignment" ADD CONSTRAINT "FK_9a50304862bf95f0298ffc1896c" FOREIGN KEY ("receiverUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "exclusion" ADD CONSTRAINT "FK_10f3b58b3c6fa607ad7f04fcb60" FOREIGN KEY ("groupId") REFERENCES "group"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "exclusion" ADD CONSTRAINT "FK_82f824b7da57c34e5f5df920f3c" FOREIGN KEY ("userAId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "exclusion" ADD CONSTRAINT "FK_64297c9a47b1062bbde437aff43" FOREIGN KEY ("userBId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "exclusion" DROP CONSTRAINT "FK_64297c9a47b1062bbde437aff43"`,
    );
    await queryRunner.query(
      `ALTER TABLE "exclusion" DROP CONSTRAINT "FK_82f824b7da57c34e5f5df920f3c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "exclusion" DROP CONSTRAINT "FK_10f3b58b3c6fa607ad7f04fcb60"`,
    );
    await queryRunner.query(
      `ALTER TABLE "assignment" DROP CONSTRAINT "FK_9a50304862bf95f0298ffc1896c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "assignment" DROP CONSTRAINT "FK_925feb3e4f94138bc168c033c04"`,
    );
    await queryRunner.query(
      `ALTER TABLE "assignment" DROP CONSTRAINT "FK_291d453363d9d3a5b6a603c8bb1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "draw" DROP CONSTRAINT "FK_8103de963ae5f841445d7dbd7ca"`,
    );
    await queryRunner.query(`DROP TABLE "exclusion"`);
    await queryRunner.query(`DROP TABLE "assignment"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3bb4feb3ac05ec3369e1e3353e"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_1d14e6f99a7b180cc3d16b9789"`,
    );
    await queryRunner.query(`DROP TABLE "draw"`);
  }
}
