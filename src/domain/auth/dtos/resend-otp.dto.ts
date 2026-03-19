import { IsEmail, IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { OtpType } from 'src/core/constants/app.constants';

export class ResendOtpDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    enum: OtpType,
    description: '1 for Email Verification, 2 for Forgot Password',
  })
  @IsEnum(OtpType)
  @IsNotEmpty()
  type: OtpType;
}
