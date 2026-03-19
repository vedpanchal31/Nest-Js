import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSoftDeleteToUsersAndProfiles1773661754720 implements MigrationInterface {
  name = 'AddSoftDeleteToUsersAndProfiles1773661754720';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "profiles" ADD "deleted_at" TIMESTAMP`,
    );
    await queryRunner.query(`ALTER TABLE "users" ADD "deleted_at" TIMESTAMP`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "deleted_at"`);
    await queryRunner.query(`ALTER TABLE "profiles" DROP COLUMN "deleted_at"`);
  }
}
