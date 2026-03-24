import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumberString, Allow } from 'class-validator';

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

  @ApiPropertyOptional({ type: 'string', format: 'binary' })
  @Allow()
  @IsOptional()
  image?: any;

  @ApiPropertyOptional({ example: 'category-uuid' })
  @IsOptional()
  @IsString()
  categoryId?: string;
}
