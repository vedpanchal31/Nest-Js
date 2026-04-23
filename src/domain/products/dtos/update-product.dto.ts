import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsNumber,
  IsNumberString,
  Allow,
  IsUUID,
  Min,
} from 'class-validator';

export class UpdateProductDto {
  @ApiPropertyOptional({ example: 'Updated Gaming Mouse' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'New ergonomic design for professionals.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: '29.99' })
  @IsOptional()
  @IsNumberString()
  price?: string;

  @ApiPropertyOptional({
    type: 'array',
    items: { type: 'string', format: 'binary' },
    description: 'Multiple product images to upload',
  })
  @Allow()
  @IsOptional()
  images?: any[];

  @ApiPropertyOptional({
    description: 'Category ID for the product',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsString()
  @IsUUID('4')
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'Stock quantity',
    example: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  stockQuantity?: number;

  @ApiPropertyOptional({
    description: 'Minimum stock threshold for alerts',
    example: 10,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minStockThreshold?: number;

  @ApiPropertyOptional({
    description: 'Reorder level when stock needs replenishment',
    example: 20,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  reorderLevel?: number;

  @ApiPropertyOptional({
    description: 'Product availability status',
    example: true,
  })
  @IsOptional()
  isAvailable?: boolean;
}
