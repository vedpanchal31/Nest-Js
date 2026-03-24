import { MigrationInterface, QueryRunner } from "typeorm";

export class DeliveryPartnerSetup1774334969844 implements MigrationInterface {
    name = 'DeliveryPartnerSetup1774334969844'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "delivery_partner_status" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "is_online" boolean NOT NULL DEFAULT false, "is_available" boolean NOT NULL DEFAULT true, "currentLat" numeric(10,8), "currentLng" numeric(11,8), "last_seen_at" TIMESTAMP, "current_order_id" character varying, "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "partner_id" uuid, CONSTRAINT "REL_76e945f9af4e45e39a1621145e" UNIQUE ("partner_id"), CONSTRAINT "PK_2b41d710b30120f9419c4411852" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "delivery_partners" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "vehicle_type" character varying NOT NULL, "vehicle_name" character varying NOT NULL, "rc_book_photo" character varying, "license_photo" character varying, "rating" numeric(3,2) NOT NULL DEFAULT '0', "is_verified" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "user_id" uuid, CONSTRAINT "REL_6263f85f19ca48264691b74aec" UNIQUE ("user_id"), CONSTRAINT "PK_282c55e1a8d521fe45bd419a191" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "delivery_partner_status" ADD CONSTRAINT "FK_76e945f9af4e45e39a1621145ea" FOREIGN KEY ("partner_id") REFERENCES "delivery_partners"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "delivery_partners" ADD CONSTRAINT "FK_6263f85f19ca48264691b74aecc" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "delivery_partners" DROP CONSTRAINT "FK_6263f85f19ca48264691b74aecc"`);
        await queryRunner.query(`ALTER TABLE "delivery_partner_status" DROP CONSTRAINT "FK_76e945f9af4e45e39a1621145ea"`);
        await queryRunner.query(`DROP TABLE "delivery_partners"`);
        await queryRunner.query(`DROP TABLE "delivery_partner_status"`);
    }

}
