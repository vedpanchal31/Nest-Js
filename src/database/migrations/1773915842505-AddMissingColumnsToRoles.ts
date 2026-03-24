import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMissingColumnsToRoles1773915842505 implements MigrationInterface {
  name = 'AddMissingColumnsToRoles1773915842505';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "roles" ADD "description" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "roles" ADD "type" smallint NOT NULL DEFAULT '1'`,
    );
    await queryRunner.query(`ALTER TABLE "roles" ADD "user_id" uuid`);
    await queryRunner.query(
      `ALTER TABLE "roles" ADD CONSTRAINT "FK_roles_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "roles" DROP CONSTRAINT "FK_roles_user"`,
    );
    await queryRunner.query(`ALTER TABLE "roles" DROP COLUMN "user_id"`);
    await queryRunner.query(`ALTER TABLE "roles" DROP COLUMN "type"`);
    await queryRunner.query(`ALTER TABLE "roles" DROP COLUMN "description"`);
  }
}
