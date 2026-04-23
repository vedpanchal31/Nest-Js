import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateMediaTable1774431438474 implements MigrationInterface {
  name = 'CreateMediaTable1774431438474';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'media',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'original_name',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'file_name',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'mime_type',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'size',
            type: 'bigint',
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['image', 'pdf', 'zip', 'excel', 'document', 'other'],
          },
          {
            name: 'path',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'url',
            type: 'varchar',
            length: '1000',
            isNullable: true,
          },
          {
            name: 'alt',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'uploaded_by_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'deleted_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
        foreignKeys: [
          {
            columnNames: ['uploaded_by_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'users',
            onDelete: 'SET NULL',
          },
        ],
        indices: [
          {
            name: 'IDX_media_type',
            columnNames: ['type'],
          },
          {
            name: 'IDX_media_uploaded_by_id',
            columnNames: ['uploaded_by_id'],
          },
          {
            name: 'IDX_media_is_active',
            columnNames: ['is_active'],
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('media');
  }
}
