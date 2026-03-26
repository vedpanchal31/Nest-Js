import { MigrationInterface, QueryRunner, TableIndex } from 'typeorm';

export class AddNotificationIndexes1774431438463 implements MigrationInterface {
    name = 'AddNotificationIndexes1774431438463';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Composite indexes for common queries
        await queryRunner.createIndex(
            'notifications',
            new TableIndex({
                name: 'IDX_NOTIFICATIONS_USER_CREATED',
                columnNames: ['userId', 'createdAt'],
            }),
        );

        await queryRunner.createIndex(
            'notifications',
            new TableIndex({
                name: 'IDX_NOTIFICATIONS_USER_READ',
                columnNames: ['userId', 'isRead'],
            }),
        );

        await queryRunner.createIndex(
            'notifications',
            new TableIndex({
                name: 'IDX_NOTIFICATIONS_USER_TYPE',
                columnNames: ['userId', 'type'],
            }),
        );

        await queryRunner.createIndex(
            'notifications',
            new TableIndex({
                name: 'IDX_NOTIFICATIONS_STATUS_CREATED',
                columnNames: ['status', 'createdAt'],
            }),
        );

        await queryRunner.createIndex(
            'notifications',
            new TableIndex({
                name: 'IDX_NOTIFICATIONS_ISREAD_CREATED',
                columnNames: ['isRead', 'createdAt'],
            }),
        );

        // Single column indexes
        await queryRunner.createIndex(
            'notifications',
            new TableIndex({
                name: 'IDX_NOTIFICATIONS_USERID',
                columnNames: ['userId'],
            }),
        );

        await queryRunner.createIndex(
            'notifications',
            new TableIndex({
                name: 'IDX_NOTIFICATIONS_ISREAD',
                columnNames: ['isRead'],
            }),
        );

        await queryRunner.createIndex(
            'notifications',
            new TableIndex({
                name: 'IDX_NOTIFICATIONS_TYPE',
                columnNames: ['type'],
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropIndex('notifications', 'IDX_NOTIFICATIONS_USER_CREATED');
        await queryRunner.dropIndex('notifications', 'IDX_NOTIFICATIONS_USER_READ');
        await queryRunner.dropIndex('notifications', 'IDX_NOTIFICATIONS_USER_TYPE');
        await queryRunner.dropIndex('notifications', 'IDX_NOTIFICATIONS_STATUS_CREATED');
        await queryRunner.dropIndex('notifications', 'IDX_NOTIFICATIONS_ISREAD_CREATED');
        await queryRunner.dropIndex('notifications', 'IDX_NOTIFICATIONS_USERID');
        await queryRunner.dropIndex('notifications', 'IDX_NOTIFICATIONS_ISREAD');
        await queryRunner.dropIndex('notifications', 'IDX_NOTIFICATIONS_TYPE');
    }
}
