import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class RemoveExtraColumnsFromProductImages1774431438472 implements MigrationInterface {
  name = 'RemoveExtraColumnsFromProductImages1774431438472';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop alt column
    await queryRunner.dropColumn('product_images', 'alt');
    
    // Drop display_order column
    await queryRunner.dropColumn('product_images', 'display_order');
    
    // Drop is_active column
    await queryRunner.dropColumn('product_images', 'is_active');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Add back the columns
    await queryRunner.addColumn(
      'product_images',
      new TableColumn({
        name: 'alt',
        type: 'varchar',
        isNullable: true,
      }),
    );
    
    await queryRunner.addColumn(
      'product_images',
      new TableColumn({
        name: 'display_order',
        type: 'int',
        default: 0,
      }),
    );
    
    await queryRunner.addColumn(
      'product_images',
      new TableColumn({
        name: 'is_active',
        type: 'boolean',
        default: true,
      }),
    );
  }
}
