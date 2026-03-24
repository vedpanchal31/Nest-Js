import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum } from 'class-validator';
import { PermissionType } from 'src/core/constants/app.constants';

export class UpdateRolePermissionsDto {
  @ApiProperty({
    example: [PermissionType.CREATE_CATEGORY, PermissionType.UPDATE_CATEGORY],
    enum: PermissionType,
    isArray: true,
  })
  @IsArray()
  @IsEnum(PermissionType, { each: true })
  permissions: PermissionType[];
}
