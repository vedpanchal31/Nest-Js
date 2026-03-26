import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import type { FilePathKey } from 'src/core/constants/app.constants';

export class UploadMediaDto {
  @ApiProperty({
    description:
      'Logical storage prefix key. This stays storage-provider agnostic and is resolved on the server.',
    required: false,
    enum: ['MEDIA', 'MEDIA_IMAGE', 'MEDIA_VIDEO', 'MEDIA_DOCUMENT'],
    example: 'MEDIA_DOCUMENT',
  })
  @IsOptional()
  @IsString()
  pathKey?: FilePathKey;

  @ApiProperty({
    description:
      'Optional placeholder value used when a storage path contains #ID#.',
    required: false,
    example: 'user-123',
  })
  @IsOptional()
  @IsString()
  pathId?: string;
}

export class UpdateMediaDto {}

export class MediaResponseDto {
  @ApiProperty({
    description: 'Media ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Stored relative path',
    example: 'public/media/documents/1740000000000-invoice.pdf',
  })
  path: string;

  @ApiProperty({
    description: 'Public delivery URL generated from the stored path',
    example:
      'https://res.cloudinary.com/dcegoonge/image/upload/media/documents/1740000000000-invoice.pdf',
  })
  url: string;

  @ApiProperty({
    description: 'Creation date',
    example: '2022-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Update date',
    example: '2022-01-01T00:00:00.000Z',
  })
  updatedAt: Date;

  deletedAt?: Date | null;
}

export class MediaListQueryDto {
  @ApiProperty({
    description: 'Page number',
    example: 1,
    required: false,
  })
  @IsOptional()
  page?: number = 1;

  @ApiProperty({
    description: 'Items per page',
    example: 20,
    required: false,
  })
  @IsOptional()
  limit?: number = 20;

  @ApiProperty({
    description: 'Search by stored path',
    required: false,
  })
  @IsOptional()
  search?: string;
}
