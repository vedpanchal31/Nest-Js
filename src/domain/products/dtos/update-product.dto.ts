import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumberString, Allow, IsUUID } from 'class-validator';

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
    description: 'Multiple product images to upload'
  })
  @Allow()
  @IsOptional()
  images?: any[];

  @ApiPropertyOptional({
    description: 'Category ID for the product',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsOptional()
  @IsString()
  @IsUUID('4')
  categoryId?: string;
}
