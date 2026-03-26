import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateSettingsTable1774345000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'settings',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
            default: "'Velora'",
          },
          {
            name: 'tagline',
            type: 'varchar',
            length: '255',
            default: "'Premium E-Commerce Solutions'",
          },
          {
            name: 'address',
            type: 'varchar',
            length: '500',
            default: "'123 Business Avenue, New York, NY 10001'",
          },
          {
            name: 'email',
            type: 'varchar',
            length: '255',
            default: "'contact@velora.com'",
          },
          {
            name: 'phone',
            type: 'varchar',
            length: '50',
            default: "'+1 (555) 123-4567'",
          },
          {
            name: 'website',
            type: 'varchar',
            length: '255',
            default: "'https://velora.com'",
          },
          {
            name: 'logoUrl',
            type: 'varchar',
            length: '500',
            default: "'https://res.cloudinary.com/dcegoonge/image/upload/v1774418520/company-logo/hugpvjg6op8enixjsrhk.png'",
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Insert initial settings record
    await queryRunner.query(`
      INSERT INTO "settings" ("name", "tagline", "address", "email", "phone", "website", "logoUrl")
      VALUES ('Velora', 'Premium E-Commerce Solutions', '123 Business Avenue, New York, NY 10001', 'contact@velora.com', '+1 (555) 123-4567', 'https://velora.com', 'https://res.cloudinary.com/dcegoonge/image/upload/v1774418520/company-logo/hugpvjg6op8enixjsrhk.png')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('settings');
  }
}
