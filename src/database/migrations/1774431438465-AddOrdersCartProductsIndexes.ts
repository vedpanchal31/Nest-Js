import { MigrationInterface, QueryRunner, TableIndex } from 'typeorm';

export class AddOrdersCartProductsIndexes1774431438465 implements MigrationInterface {
    name = 'AddOrdersCartProductsIndexes1774431438465';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Orders table indexes
        await queryRunner.createIndex(
            'orders',
            new TableIndex({
                name: 'IDX_ORDERS_USER_CREATED',
                columnNames: ['user_id', 'created_at'],
            }),
        );

        await queryRunner.createIndex(
            'orders',
            new TableIndex({
                name: 'IDX_ORDERS_STATUS_CREATED',
                columnNames: ['status', 'created_at'],
            }),
        );

        // Cart items table indexes
        await queryRunner.createIndex(
            'cart_items',
            new TableIndex({
                name: 'IDX_CART_ITEMS_USER_ID',
                columnNames: ['user_id'],
            }),
        );

        await queryRunner.createIndex(
            'cart_items',
            new TableIndex({
                name: 'IDX_CART_ITEMS_PRODUCT_ID',
                columnNames: ['product_id'],
            }),
        );

        // Products table indexes
        await queryRunner.createIndex(
            'products',
            new TableIndex({
                name: 'IDX_PRODUCTS_CATEGORY_STATUS',
                columnNames: ['category_id', 'status'],
            }),
        );

        await queryRunner.createIndex(
            'products',
            new TableIndex({
                name: 'IDX_PRODUCTS_SUPPLIER_ID',
                columnNames: ['supplier_id'],
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropIndex('orders', 'IDX_ORDERS_USER_CREATED');
        await queryRunner.dropIndex('orders', 'IDX_ORDERS_STATUS_CREATED');
        await queryRunner.dropIndex('cart_items', 'IDX_CART_ITEMS_USER_ID');
        await queryRunner.dropIndex('cart_items', 'IDX_CART_ITEMS_PRODUCT_ID');
        await queryRunner.dropIndex('products', 'IDX_PRODUCTS_CATEGORY_STATUS');
        await queryRunner.dropIndex('products', 'IDX_PRODUCTS_SUPPLIER_ID');
    }
}
