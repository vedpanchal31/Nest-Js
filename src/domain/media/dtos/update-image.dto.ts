import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsString,
  IsUUID,
  IsArray,
  IsOptional,
} from 'class-validator';
import { Transform } from 'class-transformer';

export enum EntityType {
  PRODUCT = 'product',
  CATEGORY = 'category',
}

export class UpdateImageDto {
  @ApiProperty({
    description: 'Type of entity (product or category)',
    enum: EntityType,
    example: EntityType.PRODUCT,
  })
  @IsEnum(EntityType)
  @IsNotEmpty()
  entityType: EntityType;

  @ApiProperty({
    description: 'ID of the entity (product ID or category ID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsUUID('4')
  @IsNotEmpty()
  entityId: string;

  @ApiProperty({
    description: 'New images to upload',
    type: 'array',
    items: { type: 'string', format: 'binary' },
    required: false,
  })
  @IsArray()
  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) {
      return value.filter((file) => file && file.buffer);
    }
    return [];
  })
  images?: Express.Multer.File[];

  @ApiProperty({
    description: 'IDs of existing images to delete',
    example: ['image-id-1', 'image-id-2'],
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    // Handle empty strings and convert to empty array
    if (value === '' || value === null || value === undefined) {
      return [];
    }
    return Array.isArray(value) ? value : [value].filter(Boolean);
  })
  deleteImageIds?: string[];
}

export class SingleImageUploadDto {
  @ApiProperty({
    description: 'Type of entity (product or category)',
    enum: EntityType,
    example: EntityType.PRODUCT,
  })
  @IsEnum(EntityType)
  @IsNotEmpty()
  entityType: EntityType;

  @ApiProperty({
    description: 'ID of the entity (product ID or category ID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsUUID('4')
  @IsNotEmpty()
  entityId: string;
}
