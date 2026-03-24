import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsString,
  Allow,
  IsLongitude,
  IsLatitude,
  IsEmail,
  IsStrongPassword,
  MaxLength,
} from 'class-validator';

export class RegisterDeliveryPartnerDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(50)
  email: string;

  @ApiProperty({ example: 'password@123' })
  @IsString()
  @IsNotEmpty()
  @IsStrongPassword({
    minLength: 8,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 1,
  })
  password: string;

  @ApiProperty({ example: 'Bike' })
  @IsString()
  @IsNotEmpty()
  vehicleType: string;

  @ApiProperty({ example: 'Honda Shine' })
  @IsString()
  @IsNotEmpty()
  vehicleName: string;

  @ApiProperty({ example: '123 Main St' })
  @IsString()
  @IsNotEmpty()
  addressLine1: string;

  @ApiProperty({ example: 'NY' })
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiProperty({ example: 40.7128 })
  @IsLatitude()
  latitude: number;

  @ApiProperty({ example: -74.006 })
  @Type(() => Number)
  @IsLongitude()
  longitude: number;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    required: true,
  })
  @Allow()
  rcBookPhoto: any;
}
