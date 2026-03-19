import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserTypeToUsers1773398211763 implements MigrationInterface {
  name = 'AddUserTypeToUsers1773398211763';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "user_type" smallint NOT NULL DEFAULT '1'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "user_type"`);
  }
}
