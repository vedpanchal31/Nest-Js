import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddMissingColumns1774431438460 implements MigrationInterface {
    name = 'AddMissingColumns1774431438460';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add status to products
        await queryRunner.addColumn(
            'products',
            new TableColumn({
                name: 'status',
                type: 'smallint',
                default: 1,
                isNullable: false,
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn('products', 'status');
    }
}
