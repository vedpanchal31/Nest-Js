import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty } from 'class-validator';

export class UpdateStatusDto {
  @ApiProperty({ example: true, required: true })
  @IsBoolean()
  @IsNotEmpty()
  isOnline: boolean;
}
