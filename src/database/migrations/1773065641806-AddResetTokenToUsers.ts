import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddResetTokenToUsers1773065641806 implements MigrationInterface {
  name = 'AddResetTokenToUsers1773065641806';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "reset_token" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "reset_token"`);
  }
}
