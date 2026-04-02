import { ApiProperty } from '@nestjs/swagger';

class PermissionVm {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;
}

class RoleVm {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ type: [PermissionVm] })
  permissions: PermissionVm[];
}

class UserVm {
  @ApiProperty()
  token: string;

  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  userType: number;

  @ApiProperty({ type: [RoleVm] })
  roles: RoleVm[];
}

export class LoginResponseVm {
  @ApiProperty({
    name: 'status',
    format: 'boolean',
  })
  status: boolean;

  @ApiProperty({
    name: 'message',
    format: 'string',
  })
  message: string;

  @ApiProperty({ type: UserVm })
  user: UserVm;
}
