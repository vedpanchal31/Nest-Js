import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { UserType } from 'src/core/constants/app.constants';

export class CreateManagedUserDto {
  @ApiProperty({ example: 'SubAdmin User' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'subadmin@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ enum: UserType, example: UserType.SUBADMIN })
  @IsEnum(UserType)
  userType: UserType;

  @ApiPropertyOptional({
    description: 'Role ID for SubAdmins',
    example: 'uuid-of-role',
  })
  @IsUUID()
  @IsOptional()
  roleId?: string;
}
