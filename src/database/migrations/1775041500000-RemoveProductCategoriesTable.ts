import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class RemoveProductCategoriesTable1775041500000 implements MigrationInterface {
  name = 'RemoveProductCategoriesTable1775041500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes first
    await queryRunner.dropIndex('product_categories', 'IDX_PRODUCT_CATEGORIES_CATEGORY_ID');
    await queryRunner.dropIndex('product_categories', 'IDX_PRODUCT_CATEGORIES_PRODUCT_ID');
    await queryRunner.dropIndex('product_categories', 'PK_PRODUCT_CATEGORIES');

    // Drop the product_categories table
    await queryRunner.dropTable('product_categories');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recreate product_categories table
    await queryRunner.createTable(
      new Table({
        name: 'product_categories',
        columns: [
          {
            name: 'product_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'category_id',
            type: 'uuid',
            isNullable: false,
          },
        ],
        foreignKeys: [
          {
            columnNames: ['product_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'products',
            onDelete: 'CASCADE',
          },
          {
            columnNames: ['category_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'categories',
            onDelete: 'CASCADE',
          },
        ],
      }),
    );

    // Add indexes back
    await queryRunner.createIndex(
      'product_categories',
      new TableIndex({
        name: 'PK_PRODUCT_CATEGORIES',
        columnNames: ['product_id', 'category_id'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'product_categories',
      new TableIndex({
        name: 'IDX_PRODUCT_CATEGORIES_PRODUCT_ID',
        columnNames: ['product_id'],
      }),
    );

    await queryRunner.createIndex(
      'product_categories',
      new TableIndex({
        name: 'IDX_PRODUCT_CATEGORIES_CATEGORY_ID',
        columnNames: ['category_id'],
      }),
    );
  }
}
