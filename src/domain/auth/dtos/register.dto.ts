import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsStrongPassword,
  MaxLength,
} from 'class-validator';
import { UserType } from 'src/core/constants/app.constants';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @ApiProperty({
    name: 'name',
    required: true,
    maxLength: 100,
    description: 'User full name',
    format: 'string',
  })
  name: string;

  @IsEmail()
  @IsNotEmpty()
  @MaxLength(50)
  @ApiProperty({
    name: 'email',
    required: true,
    maxLength: 50,
    description: 'User email',
    format: 'string',
  })
  email: string;

  @IsString()
  @IsNotEmpty()
  @IsStrongPassword({
    minLength: 8,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 1,
  })
  @ApiProperty({
    name: 'password',
    example: 'password@123',
    required: true,
    minLength: 8,
    format: 'string',
    description: 'User password (min 8 character)',
  })
  password: string;

  @IsOptional()
  @IsEnum(UserType)
  @ApiProperty({
    name: 'userType',
    required: false,
    enum: UserType,
    description: 'User type: 1 = User (default), 3 = Supplier',
    default: UserType.USER,
  })
  userType?: UserType;
}
