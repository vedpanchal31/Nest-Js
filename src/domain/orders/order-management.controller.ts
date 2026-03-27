import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
  Req,
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
import { OrderService } from './orders.service';
import { UpdateOrderStatusDto } from './dtos/update-order-status.dto';
import { AuthGuard } from '../../core/guards/auth.guard';
import { RoleGuard } from '../../core/guards/role.guard';
import { RoutePermission } from '../../core/decorators/route-permission.decorator';
import { PermissionType } from '../../core/constants/interfaces/common/permissions';
import { OrderStatus } from '../../core/constants/app.constants';
import { ITokenPayload } from 'src/core/constants/interfaces/common';

@ApiTags('Order Management')
@ApiBearerAuth()
@UseGuards(AuthGuard, RoleGuard)
@Controller('order-management')
export class OrderManagementController {
  constructor(private readonly orderService: OrderService) { }

  @Get()
  @RoutePermission(PermissionType.VIEW_ORDERS)
  @ApiOperation({ summary: 'List all orders (Admin/Supplier)' })
  @ApiQuery({ name: 'page', required: true, example: 1 })
  @ApiQuery({ name: 'limit', required: true, example: 10 })
  @ApiQuery({ name: 'status', required: false, enum: OrderStatus })
  @ApiQuery({ name: 'startDate', required: false, type: 'string' })
  @ApiQuery({ name: 'endDate', required: false, type: 'string' })
  @ApiQuery({ name: 'search', required: false, type: 'string' })
  async getManagementOrders(
    @Req() req: { user: ITokenPayload },
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('status') status?: OrderStatus,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('search') search?: string,
  ) {
    return await this.orderService.getManagementOrders(
      req.user,
      page,
      limit,
      status ? Number(status) : undefined,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      search,
    );
  }

  @Get(':id')
  @RoutePermission(PermissionType.VIEW_ORDERS)
  @ApiOperation({ summary: 'Get order details by ID (Admin/Supplier)' })
  async getManagementOrderDetails(
    @Req() req: { user: ITokenPayload },
    @Param('id') id: string,
  ) {
    return await this.orderService.getManagementOrderDetails(id, req.user);
  }

  @Patch(':id/status')
  @RoutePermission(PermissionType.UPDATE_ORDER_STATUS)
  @ApiOperation({ summary: 'Update order status (Admin/Supplier)' })
  async updateOrderStatus(
    @Req() req: { user: ITokenPayload },
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return await this.orderService.updateOrderStatus(id, dto, req.user);
  }

  @Delete(':id')
  @RoutePermission(PermissionType.DELETE_ORDER)
  @ApiOperation({ summary: 'Soft delete an order (Admin)' })
  async deleteOrder(@Param('id') id: string) {
    return await this.orderService.deleteOrder(id);
  }

  @Get('report/download')
  @RoutePermission(PermissionType.VIEW_ORDERS)
  @ApiOperation({ summary: 'Download orders Excel report (Admin/Supplier)' })
  @ApiQuery({ name: 'status', required: false, enum: OrderStatus })
  @ApiQuery({ name: 'startDate', required: false, type: 'string' })
  @ApiQuery({ name: 'endDate', required: false, type: 'string' })
  @ApiQuery({ name: 'search', required: false, type: 'string' })
  async downloadOrdersReport(
    @Req() req: { user: ITokenPayload },
    @Res() res: Response,
    @Query('status') status?: OrderStatus,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('search') search?: string,
  ) {
    try {
      const buffer = await this.orderService.generateOrdersExcelReport(
        req.user,
        status ? Number(status) : undefined,
        startDate ? new Date(startDate) : undefined,
        endDate ? new Date(endDate) : undefined,
        search,
      );

      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `orders-report-${timestamp}.xlsx`;

      res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename=${filename}`,
        'Content-Length': buffer.length,
      });

      res.status(HttpStatus.OK).send(buffer);
    } catch (error) {
      res.status(HttpStatus.BAD_REQUEST).json({
        status: false,
        message: error.message,
      });
    }
  }
}
