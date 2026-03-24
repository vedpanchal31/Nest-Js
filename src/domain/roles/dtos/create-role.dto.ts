import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({ example: 'Category Manager' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Handles all category removals' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: 1,
    description: '1: SUB_ADMIN, 2: SUPPLIER_SUB_ADMIN',
  })
  @IsNumber()
  type: number;

  @ApiPropertyOptional({ description: 'The ID of the user creating this role' })
  @IsUUID()
  @IsOptional()
  userId?: string;
}
