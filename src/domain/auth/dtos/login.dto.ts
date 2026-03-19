import { ApiProperty } from '@nestjs/swagger';
import { Transform, TransformFnParams } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(50)
  @Transform(({ value }: TransformFnParams) =>
    (value as string).toLowerCase().trim(),
  )
  @ApiProperty({
    name: 'email',
    required: true,
    description: 'User Email',
    maxLength: 50,
    format: 'string',
    example: 'email@example.com',
  })
  email: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    name: 'password',
    example: 'password@123',
    required: true,
    minLength: 8,
    format: 'string',
    description: 'User password',
  })
  password: string;
}
