import { MigrationInterface, QueryRunner, Table, TableColumn, TableForeignKey, TableIndex } from 'typeorm';

export class AddMultiSelectCategoriesAndImages1774431438467 implements MigrationInterface {
  name = 'AddMultiSelectCategoriesAndImages1774431438467';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add image column to categories table
    await queryRunner.addColumn(
      'categories',
      new TableColumn({
        name: 'image',
        type: 'varchar',
        isNullable: true,
      }),
    );

    // 2. Create product_images table
    await queryRunner.createTable(
      new Table({
        name: 'product_images',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'url',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'alt',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'display_order',
            type: 'int',
            default: 0,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'product_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
        foreignKeys: [
          {
            columnNames: ['product_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'products',
            onDelete: 'CASCADE',
          },
        ],
      }),
    );

    // 3. Create product_categories join table
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

    // Add primary key to product_categories
    await queryRunner.createIndex(
      'product_categories',
      new TableIndex({
        name: 'PK_PRODUCT_CATEGORIES',
        columnNames: ['product_id', 'category_id'],
        isUnique: true,
      }),
    );

    // Add index for faster lookups
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

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes first
    await queryRunner.dropIndex('product_categories', 'IDX_PRODUCT_CATEGORIES_CATEGORY_ID');
    await queryRunner.dropIndex('product_categories', 'IDX_PRODUCT_CATEGORIES_PRODUCT_ID');
    await queryRunner.dropIndex('product_categories', 'PK_PRODUCT_CATEGORIES');

    // Drop tables
    await queryRunner.dropTable('product_categories');
    await queryRunner.dropTable('product_images');

    // Drop image column from categories
    await queryRunner.dropColumn('categories', 'image');
  }
}
