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
  Res,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
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
import { Public } from '../../core/decorators/public.decorator';

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrderService) { }

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

  @Get(':id/invoice')
  @ApiOperation({ summary: 'Download order invoice PDF' })
  async downloadInvoice(
    @Req() req: { user: ITokenPayload },
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    try {
      const order = await this.ordersService.getOrderSummary(id, req.user.id);
      const pdfBuffer = await this.ordersService.generateInvoice(order);

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=invoice-${id.substring(0, 8).toUpperCase()}.pdf`,
        'Content-Length': pdfBuffer.length,
      });

      res.status(HttpStatus.OK).send(pdfBuffer);
    } catch (error) {
      res.status(HttpStatus.BAD_REQUEST).json({
        status: false,
        message: error.message,
      });
    }
  }

  @Public()
  @Get('public/:id')
  @ApiOperation({ summary: 'Get public order details page (no auth required)' })
  async getPublicOrderDetails(@Param('id') id: string, @Res() res: Response) {
    const order = await this.ordersService.getPublicOrderDetails(id);
    const html = this.ordersService.renderOrderDetailsHTML(order);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  }

}
