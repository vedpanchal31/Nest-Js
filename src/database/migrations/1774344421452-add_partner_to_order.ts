import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPartnerToOrder1774344421452 implements MigrationInterface {
  name = 'AddPartnerToOrder1774344421452';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "orders" ADD "partner_id" uuid`);
    await queryRunner.query(
      `ALTER TABLE "orders" ADD CONSTRAINT "FK_2a638f6716c29482cd3aa5a6587" FOREIGN KEY ("partner_id") REFERENCES "delivery_partners"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "orders" DROP CONSTRAINT "FK_2a638f6716c29482cd3aa5a6587"`,
    );
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "partner_id"`);
  }
}
