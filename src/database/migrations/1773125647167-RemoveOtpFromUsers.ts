import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveOtpFromUsers1773125647167 implements MigrationInterface {
  name = 'RemoveOtpFromUsers1773125647167';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "otp"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "otp_expires_at"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "reset_token"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "reset_token" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "otp_expires_at" TIMESTAMP`,
    );
    await queryRunner.query(`ALTER TABLE "users" ADD "otp" character varying`);
  }
}
