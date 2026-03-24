import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { PaymentMethod } from '../../../core/constants/app.constants';

export class CreateOrderDto {
  @ApiProperty({ example: '123 Main St' })
  @IsString()
  @IsNotEmpty()
  addressLine1: string;

  @ApiPropertyOptional({ example: 'Apt 4B' })
  @IsString()
  @IsOptional()
  addressLine2?: string;

  @ApiProperty({ example: 'New York' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ example: 'NY' })
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiProperty({ example: 'Manhattan' })
  @IsString()
  @IsNotEmpty()
  region: string;

  @ApiProperty({ example: 'USA' })
  @IsString()
  @IsNotEmpty()
  country: string;

  @ApiProperty({ example: 40.7128 })
  @IsNumber()
  @IsNotEmpty()
  latitude: number;

  @ApiProperty({ example: -74.006 })
  @IsNumber()
  @IsNotEmpty()
  longitude: number;

  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.CASH_ON_DELIVERY })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;
}
