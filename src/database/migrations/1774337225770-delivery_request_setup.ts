import { MigrationInterface, QueryRunner } from 'typeorm';

export class DeliveryRequestSetup1774337225770 implements MigrationInterface {
  name = 'DeliveryRequestSetup1774337225770';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "delivery_requests" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "status" integer NOT NULL DEFAULT '1', "expires_at" TIMESTAMP NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "order_id" uuid, "partner_id" uuid, CONSTRAINT "PK_78f69c489c0bb2cc79ea1578b90" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "delivery_requests" ADD CONSTRAINT "FK_f5d8f853ce602a1c61a747f9788" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "delivery_requests" ADD CONSTRAINT "FK_eb687791aa7a2c6c7d79b841408" FOREIGN KEY ("partner_id") REFERENCES "delivery_partners"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "delivery_requests" DROP CONSTRAINT "FK_eb687791aa7a2c6c7d79b841408"`,
    );
    await queryRunner.query(
      `ALTER TABLE "delivery_requests" DROP CONSTRAINT "FK_f5d8f853ce602a1c61a747f9788"`,
    );
    await queryRunner.query(`DROP TABLE "delivery_requests"`);
  }
}
