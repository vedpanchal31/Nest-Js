import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsNotEmpty, Min } from 'class-validator';

export class UpdateStockDto {
  @ApiProperty({
    description: 'New stock quantity',
    example: 150,
  })
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  stockQuantity: number;

  @ApiProperty({
    description: 'Minimum stock threshold for alerts',
    example: 10,
    required: false,
  })
  @IsNumber()
  @Min(0)
  minStockThreshold?: number;

  @ApiProperty({
    description: 'Reorder level when stock needs replenishment',
    example: 20,
    required: false,
  })
  @IsNumber()
  @Min(0)
  reorderLevel?: number;
}
