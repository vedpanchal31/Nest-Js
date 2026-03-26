import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveDescriptionFromMedia1774601100000
  implements MigrationInterface
{
  name = 'RemoveDescriptionFromMedia1774601100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "media" DROP COLUMN IF EXISTS "description"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "media" ADD COLUMN "description" text`,
    );
  }
}
