import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({ description: 'The unique token received from verify-otp' })
  @IsNotEmpty()
  @IsString()
  resetToken: string;

  @ApiProperty({ example: 'user@example.com' })
  @IsNotEmpty()
  @IsString()
  email: string;

  @ApiProperty({ example: 'newPassword123' })
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'newPassword123' })
  @IsNotEmpty()
  confirmPassword: string;
}
