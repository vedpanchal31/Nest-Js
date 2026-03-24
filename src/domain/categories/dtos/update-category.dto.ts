import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateCategoryDto {
  @ApiProperty({
    description: 'The name of the category',
    example: 'Electronics',
    required: false,
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: 'A brief description of the category',
    example: 'All kinds of electronic items',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;
}
