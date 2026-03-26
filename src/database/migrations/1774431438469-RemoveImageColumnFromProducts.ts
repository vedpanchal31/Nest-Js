import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class RemoveImageColumnFromProducts1774431438469 implements MigrationInterface {
  name = 'RemoveImageColumnFromProducts1774431438469';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Remove image column from products table
    await queryRunner.dropColumn('products', 'image');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Add back image column
    await queryRunner.addColumn(
      'products',
      new TableColumn({
        name: 'image',
        type: 'varchar',
        isNullable: true,
      }),
    );
  }
}
