import { ApiProperty } from '@nestjs/swagger';
import {
  Allow,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'Wireless Mouse' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'A highly responsive wireless mouse.' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: '25.99' })
  @IsNumberString() // Use IsNumberString because FormData sends data as strings
  @IsNotEmpty()
  price: string;

  // We add this for Swagger documentation so it knows to show a file upload button.
  // We add @Allow() because main.ts has filterNonWhitelisted: true.
  // Without it, class-validator thinks 'image' is an illegal extra property.
  @ApiProperty({
    type: 'array',
    items: { type: 'string', format: 'binary' },
    description: 'Multiple product images to be uploaded',
    required: false,
  })
  @Allow()
  @IsOptional()
  images?: any[];

  @ApiProperty({
    description: 'Category ID for the product',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: true,
  })
  @IsString()
  @IsUUID('4')
  @IsNotEmpty()
  categoryId: string;

  @ApiProperty({
    description: 'Supplier ID for the product (Admin only)',
    example: 'Supplier ID',
    required: false,
  })
  @IsString()
  @IsOptional()
  supplierId?: string;
}
