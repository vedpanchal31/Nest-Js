import { ApiProperty } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

export class BulkUploadDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Excel file (.xlsx) with data',
  })
  @IsOptional()
  excel?: Express.Multer.File;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'ZIP file containing images referenced in Excel',
    required: false,
  })
  @IsOptional()
  imagesZip?: Express.Multer.File;
}

export interface BulkCategoryRow {
  'Name*': string;
  Description: string;
  Image: string;
}

export interface BulkProductRow {
  'Name*': string;
  'Description*': string;
  'Price*': number | string;
  'Category*': string;
  Images: string;
}
