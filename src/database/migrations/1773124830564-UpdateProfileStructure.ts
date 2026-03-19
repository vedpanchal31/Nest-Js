import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateProfileStructure1773124830564 implements MigrationInterface {
  name = 'UpdateProfileStructure1773124830564';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "FK_23371445bd80cb3e413089551bf"`,
    );
    await queryRunner.query(`ALTER TABLE "profiles" DROP COLUMN "avatar"`);
    await queryRunner.query(`ALTER TABLE "profiles" DROP COLUMN "gender"`);
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "UQ_23371445bd80cb3e413089551bf"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "profile_id"`);
    await queryRunner.query(
      `ALTER TABLE "profiles" ADD "name" character varying(100) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "profiles" ADD "email" character varying(100) NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "profiles" ADD "user_id" uuid`);
    await queryRunner.query(
      `ALTER TABLE "profiles" ADD CONSTRAINT "UQ_9e432b7df0d182f8d292902d1a2" UNIQUE ("user_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "profiles" ADD CONSTRAINT "FK_9e432b7df0d182f8d292902d1a2" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "profiles" DROP CONSTRAINT "FK_9e432b7df0d182f8d292902d1a2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "profiles" DROP CONSTRAINT "UQ_9e432b7df0d182f8d292902d1a2"`,
    );
    await queryRunner.query(`ALTER TABLE "profiles" DROP COLUMN "user_id"`);
    await queryRunner.query(`ALTER TABLE "profiles" DROP COLUMN "email"`);
    await queryRunner.query(`ALTER TABLE "profiles" DROP COLUMN "name"`);
    await queryRunner.query(`ALTER TABLE "users" ADD "profile_id" uuid`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "UQ_23371445bd80cb3e413089551bf" UNIQUE ("profile_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "profiles" ADD "gender" character varying(50)`,
    );
    await queryRunner.query(
      `ALTER TABLE "profiles" ADD "avatar" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_23371445bd80cb3e413089551bf" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
