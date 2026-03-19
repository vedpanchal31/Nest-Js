import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsString, Length } from 'class-validator';
import { OtpType } from 'src/core/constants/app.constants';

export class VerifyOtpDto {
  @ApiProperty({
    name: 'email',
    example: 'user@example.com',
    description: 'Registered user email',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    name: 'otp',
    example: '123456',
    minLength: 6,
    maxLength: 6,
    description: '6-digit OTP sent to user email',
  })
  @IsString()
  @Length(6, 6, { message: 'OTP must be 6 digits' })
  otp: string;

  @ApiProperty({
    name: 'otpType',
    enum: OtpType,
    example: OtpType.EMAIL_VERIFICATION,
    description: 'OTP purpose',
  })
  @IsEnum(OtpType)
  otpType: OtpType;
}
