import type { MigrationInterface, QueryRunner } from 'typeorm';

// Busca de participantes sem diferenciar acentos.
export class EnableUnaccent1795461505511 implements MigrationInterface {
  name = 'EnableUnaccent1795461505511';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS unaccent`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP EXTENSION IF EXISTS unaccent`);
  }
}
