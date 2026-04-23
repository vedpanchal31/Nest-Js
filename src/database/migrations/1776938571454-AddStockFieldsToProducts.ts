import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStockFieldsToProducts1776938571454 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "products" 
            ADD COLUMN "stock_quantity" integer NOT NULL DEFAULT 0,
            ADD COLUMN "min_stock_threshold" integer NOT NULL DEFAULT 10,
            ADD COLUMN "reorder_level" integer NOT NULL DEFAULT 20,
            ADD COLUMN "is_available" boolean NOT NULL DEFAULT true
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "products" 
            DROP COLUMN "stock_quantity",
            DROP COLUMN "min_stock_threshold", 
            DROP COLUMN "reorder_level",
            DROP COLUMN "is_available"
        `);
  }
}
