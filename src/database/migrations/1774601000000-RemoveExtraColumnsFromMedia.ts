import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveExtraColumnsFromMedia1774601000000
  implements MigrationInterface
{
  name = 'RemoveExtraColumnsFromMedia1774601000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_media_type"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_media_uploaded_by_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_media_is_active"`,
    );
    await queryRunner.query(`ALTER TABLE "media" DROP COLUMN "original_name"`);
    await queryRunner.query(`ALTER TABLE "media" DROP COLUMN "file_name"`);
    await queryRunner.query(`ALTER TABLE "media" DROP COLUMN "mime_type"`);
    await queryRunner.query(`ALTER TABLE "media" DROP COLUMN "size"`);
    await queryRunner.query(`ALTER TABLE "media" DROP COLUMN "type"`);
    await queryRunner.query(`ALTER TABLE "media" DROP COLUMN "url"`);
    await queryRunner.query(`ALTER TABLE "media" DROP COLUMN "alt"`);
    await queryRunner.query(`ALTER TABLE "media" DROP COLUMN "uploaded_by_id"`);
    await queryRunner.query(`ALTER TABLE "media" DROP COLUMN "metadata"`);
    await queryRunner.query(`ALTER TABLE "media" DROP COLUMN "is_active"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."media_type_enum"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."media_type_enum" AS ENUM('image', 'video', 'pdf', 'zip', 'excel', 'document', 'other')`,
    );
    await queryRunner.query(
      `ALTER TABLE "media" ADD "original_name" character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "media" ADD "file_name" character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "media" ADD "mime_type" character varying(100)`,
    );
    await queryRunner.query(`ALTER TABLE "media" ADD "size" bigint`);
    await queryRunner.query(
      `ALTER TABLE "media" ADD "type" "public"."media_type_enum" NOT NULL DEFAULT 'other'`,
    );
    await queryRunner.query(
      `ALTER TABLE "media" ADD "url" character varying(1000)`,
    );
    await queryRunner.query(
      `ALTER TABLE "media" ADD "alt" character varying(255)`,
    );
    await queryRunner.query(`ALTER TABLE "media" ADD "uploaded_by_id" uuid`);
    await queryRunner.query(`ALTER TABLE "media" ADD "metadata" jsonb`);
    await queryRunner.query(
      `ALTER TABLE "media" ADD "is_active" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_media_type" ON "media" ("type")`);
    await queryRunner.query(
      `CREATE INDEX "IDX_media_uploaded_by_id" ON "media" ("uploaded_by_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_media_is_active" ON "media" ("is_active")`,
    );
  }
}
