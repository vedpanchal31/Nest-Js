import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';
import { UserType } from 'src/core/constants/app.constants';

export class UpdateManagedUserDto {
  @ApiPropertyOptional({ example: 'Updated User Name' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'updated@example.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: 'newpassword123', minLength: 6 })
  @IsString()
  @IsOptional()
  @MinLength(6)
  password?: string;

  @ApiPropertyOptional({ enum: UserType, example: UserType.SUBADMIN })
  @IsEnum(UserType)
  @IsOptional()
  userType?: UserType;

  @ApiPropertyOptional({
    description: 'Role ID for SubAdmins',
    example: 'uuid-of-role',
  })
  @IsUUID()
  @IsOptional()
  roleId?: string;
}
