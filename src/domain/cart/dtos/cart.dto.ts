import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsUUID, Min } from 'class-validator';

export class AddToCartDto {
  @ApiProperty({ example: 'productId' })
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  quantity: number;
}

export class UpdateCartDto {
  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  quantity: number;
}
