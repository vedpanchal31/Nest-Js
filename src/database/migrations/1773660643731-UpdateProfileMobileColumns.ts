import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateProfileMobileColumns1773660643731 implements MigrationInterface {
  name = 'UpdateProfileMobileColumns1773660643731';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "profiles" DROP COLUMN "phone_number"`,
    );
    await queryRunner.query(
      `ALTER TABLE "profiles" ADD "country_code" character varying(5)`,
    );
    await queryRunner.query(
      `ALTER TABLE "profiles" ADD "country_shortcode" character varying(5)`,
    );
    await queryRunner.query(
      `ALTER TABLE "profiles" ADD "mobile" character varying(15)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "profiles" DROP COLUMN "mobile"`);
    await queryRunner.query(
      `ALTER TABLE "profiles" DROP COLUMN "country_shortcode"`,
    );
    await queryRunner.query(
      `ALTER TABLE "profiles" DROP COLUMN "country_code"`,
    );
    await queryRunner.query(
      `ALTER TABLE "profiles" ADD "phone_number" character varying(15)`,
    );
  }
}
