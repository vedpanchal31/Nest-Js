import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AssignRoleDto {
  @ApiProperty({ example: 'uuid-of-user' })
  @IsUUID()
  userId: string;

  @ApiProperty({ example: 'uuid-of-role' })
  @IsUUID()
  roleId: string;
}
