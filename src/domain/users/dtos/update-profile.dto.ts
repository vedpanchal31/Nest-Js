import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateProfileDto {
  @ApiProperty({
    example: '123 Main St, New York, NY',
    minLength: 10,
    maxLength: 200,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(200)
  address?: string;

  @ApiProperty({ example: '1995-05-15', required: false })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiProperty({ example: '+91', required: true })
  @IsString()
  @IsNotEmpty()
  countryCode: string;

  @ApiProperty({ example: 'IN', required: true })
  @IsString()
  @IsNotEmpty()
  countryShortcode: string;

  @ApiProperty({ example: '9876543210', required: true })
  @IsString()
  @IsNotEmpty()
  mobile: string;

  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;
}
