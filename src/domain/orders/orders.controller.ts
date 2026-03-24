import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Req,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
  Patch,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { CreateOrderDto } from './dtos/create-order.dto';
import { AuthGuard } from '../../core/guards/auth.guard';
import { ITokenPayload } from '../../core/constants/interfaces/common';
import { OrderService } from './orders.service';

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrderService) {}

  @Post()
  @ApiOperation({ summary: 'Place an order' })
  async createOrder(
    @Req() req: { user: ITokenPayload },
    @Body() dto: CreateOrderDto,
  ) {
    return await this.ordersService.createOrder(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all orders for current user' })
  @ApiQuery({ name: 'page', required: true, example: 1 })
  @ApiQuery({ name: 'limit', required: true, example: 10 })
  async getAllOrders(
    @Req() req: { user: ITokenPayload },
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return await this.ordersService.getAllOrders(req.user.id, page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order summary' })
  async getOrderSummary(
    @Req() req: { user: ITokenPayload },
    @Param('id') id: string,
  ) {
    return await this.ordersService.getOrderSummary(id, req.user.id);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel an order' })
  async cancelOrder(
    @Req() req: { user: ITokenPayload },
    @Param('id') id: string,
  ) {
    return await this.ordersService.cancelOrder(id, req.user.id);
  }
}
