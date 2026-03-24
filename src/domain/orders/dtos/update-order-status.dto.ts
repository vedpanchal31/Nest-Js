import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { OrderStatus } from '../../../core/constants/app.constants';

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: OrderStatus, example: OrderStatus.SHIPPED })
  @IsEnum(OrderStatus)
  @IsNotEmpty()
  status: OrderStatus;
}
