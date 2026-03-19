import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProductsTable1774268000000 implements MigrationInterface {
  name = 'CreateProductsTable1774268000000';

  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(
      `CREATE TABLE "products"(
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying NOT NULL,
        "description" character varying NOT NULL,
        "price" numeric(10,2) NOT NULL,
        "image" character varying NOT NULL,
        "supplier_id" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_products_id" PRIMARY KEY ("id")
      )
       `,
    );
    // Add foreign key constraint to link product to the supplier (user)
    await queryRunner.query(`
      ALTER TABLE "products" 
      ADD CONSTRAINT "FK_products_supplier" 
      FOREIGN KEY ("supplier_id") REFERENCES "users"("id") ON DELETE CASCADE`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the table and constraints
    await queryRunner.query(
      `ALTER TABLE "products" DROP CONSTRAINT "FK_products_supplier"`,
    );
    await queryRunner.query(`DROP TABLE "products"`);
  }
}
