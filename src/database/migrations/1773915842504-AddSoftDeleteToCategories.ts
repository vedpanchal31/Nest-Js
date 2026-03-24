import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSoftDeleteToCategories1773915842504 implements MigrationInterface {
  name = 'AddSoftDeleteToCategories1773915842504';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "categories" ADD "deleted_at" TIMESTAMP`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "categories" DROP COLUMN "deleted_at"`,
    );
  }
}
