import { ApiProperty } from '@nestjs/swagger';

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
}
