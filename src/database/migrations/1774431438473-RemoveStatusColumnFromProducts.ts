import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableIndex,
} from 'typeorm';

export class RemoveStatusColumnFromProducts1774431438473 implements MigrationInterface {
  name = 'RemoveStatusColumnFromProducts1774431438473';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the status column
    await queryRunner.dropColumn('products', 'status');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Add back the status column
    await queryRunner.addColumn(
      'products',
      new TableColumn({
        name: 'status',
        type: 'smallint',
        default: 1,
      }),
    );

    // Recreate the index
    await queryRunner.createIndex(
      'products',
      new TableIndex({
        name: 'IDX_products_categoryId_status',
        columnNames: ['categoryId', 'status'],
      }),
    );
  }
}
