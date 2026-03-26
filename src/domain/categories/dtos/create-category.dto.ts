import { ApiProperty } from '@nestjs/swagger';
import { Allow, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({
    description: 'The name of the category',
    example: 'Electronics',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'A brief description of the category',
    example: 'All kinds of electronic items',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Category image to be uploaded',
    required: false,
  })
  @Allow()
  @IsOptional()
  image?: any;
}
