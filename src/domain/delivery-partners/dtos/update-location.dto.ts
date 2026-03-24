import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber } from 'class-validator';

export class UpdateLocationDto {
  @ApiProperty({ example: 40.7128, required: true })
  @IsNumber()
  @IsNotEmpty()
  lat: number;

  @ApiProperty({ example: -74.006, required: true })
  @IsNumber()
  @IsNotEmpty()
  lng: number;
}
