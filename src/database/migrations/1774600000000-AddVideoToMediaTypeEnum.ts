import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVideoToMediaTypeEnum1774600000000 implements MigrationInterface {
  name = 'AddVideoToMediaTypeEnum1774600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."media_type_enum" RENAME TO "media_type_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."media_type_enum" AS ENUM('image', 'video', 'pdf', 'zip', 'excel', 'document', 'other')`,
    );
    await queryRunner.query(
      `ALTER TABLE "media" ALTER COLUMN "type" TYPE "public"."media_type_enum" USING "type"::text::"public"."media_type_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."media_type_enum_old"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."media_type_enum_old" AS ENUM('image', 'pdf', 'zip', 'excel', 'document', 'other')`,
    );
    await queryRunner.query(
      `ALTER TABLE "media" ALTER COLUMN "type" TYPE "public"."media_type_enum_old" USING CASE WHEN "type"::text = 'video' THEN 'other' ELSE "type"::text END::"public"."media_type_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE "public"."media_type_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."media_type_enum_old" RENAME TO "media_type_enum"`,
    );
  }
}
