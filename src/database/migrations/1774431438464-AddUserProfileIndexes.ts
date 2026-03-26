import { MigrationInterface, QueryRunner, TableIndex } from 'typeorm';

export class AddUserProfileIndexes1774431438464 implements MigrationInterface {
    name = 'AddUserProfileIndexes1774431438464';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // User table indexes
        await queryRunner.createIndex(
            'users',
            new TableIndex({
                name: 'IDX_USERS_USER_TYPE',
                columnNames: ['user_type'],
            }),
        );

        await queryRunner.createIndex(
            'users',
            new TableIndex({
                name: 'IDX_USERS_EMAIL_VERIFIED',
                columnNames: ['is_email_verified'],
            }),
        );

        await queryRunner.createIndex(
            'users',
            new TableIndex({
                name: 'IDX_USERS_TYPE_CREATED',
                columnNames: ['user_type', 'created_at'],
            }),
        );

        await queryRunner.createIndex(
            'users',
            new TableIndex({
                name: 'IDX_USERS_VERIFIED_CREATED',
                columnNames: ['is_email_verified', 'created_at'],
            }),
        );

        await queryRunner.createIndex(
            'users',
            new TableIndex({
                name: 'IDX_USERS_CREATED_AT',
                columnNames: ['created_at'],
            }),
        );

        // Profile table indexes
        await queryRunner.createIndex(
            'profiles',
            new TableIndex({
                name: 'IDX_PROFILES_EMAIL',
                columnNames: ['email'],
            }),
        );

        await queryRunner.createIndex(
            'profiles',
            new TableIndex({
                name: 'IDX_PROFILES_MOBILE',
                columnNames: ['mobile'],
            }),
        );

        await queryRunner.createIndex(
            'profiles',
            new TableIndex({
                name: 'IDX_PROFILES_COUNTRY_SHORTCODE',
                columnNames: ['country_shortcode'],
            }),
        );

        await queryRunner.createIndex(
            'profiles',
            new TableIndex({
                name: 'IDX_PROFILES_COUNTRY_MOBILE',
                columnNames: ['country_shortcode', 'mobile'],
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropIndex('users', 'IDX_USERS_USER_TYPE');
        await queryRunner.dropIndex('users', 'IDX_USERS_EMAIL_VERIFIED');
        await queryRunner.dropIndex('users', 'IDX_USERS_TYPE_CREATED');
        await queryRunner.dropIndex('users', 'IDX_USERS_VERIFIED_CREATED');
        await queryRunner.dropIndex('users', 'IDX_USERS_CREATED_AT');
        await queryRunner.dropIndex('profiles', 'IDX_PROFILES_EMAIL');
        await queryRunner.dropIndex('profiles', 'IDX_PROFILES_MOBILE');
        await queryRunner.dropIndex('profiles', 'IDX_PROFILES_COUNTRY_SHORTCODE');
        await queryRunner.dropIndex('profiles', 'IDX_PROFILES_COUNTRY_MOBILE');
    }
}
