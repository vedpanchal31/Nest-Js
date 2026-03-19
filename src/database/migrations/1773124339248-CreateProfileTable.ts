import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProfileTable1773124339248 implements MigrationInterface {
  name = 'CreateProfileTable1773124339248';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "profiles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "avatar" character varying, "phone_number" character varying(15), "gender" character varying(50), "address" text, "date_of_birth" date, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_8e520eb4da7dc01d0e190447c8e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`ALTER TABLE "users" ADD "profile_id" uuid`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "UQ_23371445bd80cb3e413089551bf" UNIQUE ("profile_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_23371445bd80cb3e413089551bf" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "FK_23371445bd80cb3e413089551bf"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "UQ_23371445bd80cb3e413089551bf"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "profile_id"`);
    await queryRunner.query(`DROP TABLE "profiles"`);
  }
}
