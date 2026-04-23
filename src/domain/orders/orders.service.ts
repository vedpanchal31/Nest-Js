import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { Order } from './entities/order.entity';
import { CartService } from '../cart/cart.service';
import { CreateOrderDto } from './dtos/create-order.dto';
import { User } from '../users/entities/user.entity';
import {
  OrderStatus,
  PaymentMethod,
  UserType,
} from 'src/core/constants/app.constants';
import { OrderItem } from './entities/order-item.entity';
import { UpdateOrderStatusDto } from './dtos/update-order-status.dto';
import { ITokenPayload } from 'src/core/constants/interfaces/common';
import { DeliveryPartnerService } from '../delivery-partners/delivery-partners.service';
import { InvoiceService } from '../../core/services/invoice.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { ProductsService } from '../products/products.service';
import * as ExcelJS from 'exceljs';

@Injectable()
export class OrderService {
  private formatDisplayDate(value: string | Date): string {
    return new Date(value).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly cartService: CartService,
    private readonly dataSource: DataSource,
    private readonly deliveryService: DeliveryPartnerService,
    private readonly invoiceService: InvoiceService,
    @InjectQueue('notifications') private readonly notificationsQueue: Queue,
    private readonly productsService: ProductsService,
  ) {}

  async createOrder(userId: string, dto: CreateOrderDto) {
    const cartResponse = await this.cartService.getCart(userId, 1, 100);
    const cartItems = cartResponse.data;

    if (!cartItems || cartItems.length === 0) {
      throw new BadRequestException(
        'Can not place an order with an empty cart',
      );
    }

    // Validate stock availability for all cart items
    for (const item of cartItems) {
      await this.productsService.checkStockAvailability(
        item.product.id,
        item.quantity,
      );
    }

    let totalAmount = 0;
    const orderItemsData = cartItems.map((item) => {
      const price = Number(item.product.price);
      totalAmount += price * item.quantity;
      return { product: item.product, quantity: item.quantity, price: price };
    });

    const tax = 0;
    const finalAmount = totalAmount + tax;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const order = queryRunner.manager.create(Order, {
        user: { id: userId } as User,
        ...dto,
        totalAmount: finalAmount,
        tax: tax,
        status:
          dto.paymentMethod === PaymentMethod.CASH_ON_DELIVERY
            ? OrderStatus.CONFIRMED
            : OrderStatus.PENDING,
      });

      const savedOrder = await queryRunner.manager.save(order);
      const orderItems = orderItemsData.map((item) =>
        queryRunner.manager.create(OrderItem, { ...item, order: savedOrder }),
      );
      await queryRunner.manager.save(orderItems);

      // Decrease stock for all ordered items
      for (const item of cartItems) {
        await this.productsService.decreaseStock(
          item.product.id,
          item.quantity,
        );
      }

      await this.cartService.clearCart(userId);
      await queryRunner.commitTransaction();

      // Send notification: Order Created
      await this.notificationsQueue.add('send-notification', {
        userId,
        type: NotificationType.ORDER,
        title: 'Order Placed Successfully',
        message: `Your order #${savedOrder.id.substring(0, 8).toUpperCase()} has been placed successfully.`,
        actionUrl: `/orders/${savedOrder.id}`,
        eventName: 'order.created',
      });

      // Generate and save invoice PDF
      try {
        await this.invoiceService.generateInvoice(savedOrder);
        // Here you can save the PDF to cloud storage or file system
        // For now, we'll just log that it was generated
        console.log(`Invoice generated for order ${savedOrder.id}`);
      } catch (error) {
        console.error('Failed to generate invoice:', error);
        // Don't fail the order creation if invoice generation fails
      }

      // TRIGGER AUTOMATED DISPATCH
      void this.deliveryService.dispatchOrder(
        savedOrder.id,
        Number(savedOrder.latitude),
        Number(savedOrder.longitude),
      );

      return savedOrder;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async getAllOrders(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [items, total] = await this.orderRepository.findAndCount({
      where: { user: { id: userId } },
      relations: ['items', 'items.product'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      data: items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getOrderSummary(orderId: string, userId: string) {
    const order = await this.orderRepository.findOne({
      where: { id: orderId, user: { id: userId } },
      relations: ['items', 'items.product', 'user'],
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async cancelOrder(orderId: string, userId: string) {
    const order = await this.orderRepository.findOne({
      where: { id: orderId, user: { id: userId } },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (
      order.status !== OrderStatus.PENDING &&
      order.status !== OrderStatus.CONFIRMED
    ) {
      throw new BadRequestException(
        `Order cannot be cancelled in its current status.`,
      );
    }

    order.status = OrderStatus.CANCELLED;
    const savedOrder = await this.orderRepository.save(order);

    // Send notification: Order Cancelled
    await this.notificationsQueue.add('send-notification', {
      userId,
      type: NotificationType.ORDER,
      title: 'Order Cancelled',
      message: `Your order #${savedOrder.id.substring(0, 8).toUpperCase()} has been cancelled.`,
      actionUrl: `/orders/${savedOrder.id}`,
      eventName: 'order.cancelled',
    });

    return savedOrder;
  }

  // Management Logic
  async getManagementOrders(
    user: ITokenPayload,
    page: number,
    limit: number,
    status?: OrderStatus,
    startDate?: Date,
    endDate?: Date,
    search?: string,
  ) {
    const skip = (page - 1) * limit;
    const query = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.user', 'user')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .leftJoinAndSelect('product.supplier', 'supplier');

    // Supplier filter
    if (user.userType === UserType.SUPPLIER) {
      query
        .innerJoin('order.items', 'itemFilter')
        .innerJoin('itemFilter.product', 'productFilter')
        .andWhere('productFilter.supplier_id = :supplierId', {
          supplierId: user.id,
        });
    }

    // Delivery Partner filter
    if (user.userType === UserType.DELIVERY_PARTNER) {
      query
        .innerJoin(
          'delivery_partners',
          'partner',
          'partner.user_id = :userId',
          { userId: user.id },
        )
        .andWhere('order.partner_id = partner.id');
    }

    if (status) {
      query.andWhere('order.status = :status', { status });
    }

    if (startDate && endDate) {
      query.andWhere('order.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    if (search) {
      query.andWhere(
        '(user.name ILIKE :search OR user.email ILIKE :search OR order.id::text ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    query.skip(skip).take(limit).orderBy('order.createdAt', 'DESC');

    const [items, total] = await query.getManyAndCount();

    return {
      data: items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getManagementOrderDetails(orderId: string, user: ITokenPayload) {
    const query = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.user', 'user')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .leftJoinAndSelect('product.supplier', 'supplier')
      .where('order.id = :orderId', { orderId });

    if (user.userType === UserType.SUPPLIER) {
      query
        .innerJoin('order.items', 'itemFilter')
        .innerJoin('itemFilter.product', 'productFilter')
        .andWhere('productFilter.supplier_id = :supplierId', {
          supplierId: user.id,
        });
    }

    if (user.userType === UserType.DELIVERY_PARTNER) {
      // Find the partner entry for this user
      query
        .innerJoin(
          'delivery_partners',
          'partner',
          'partner.user_id = :userId',
          { userId: user.id },
        )
        .andWhere('order.partner_id = partner.id');
    }

    const order = await query.getOne();

    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async updateOrderStatus(
    orderId: string,
    dto: UpdateOrderStatusDto,
    user: ITokenPayload,
  ) {
    const order = await this.getManagementOrderDetails(orderId, user);

    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException(
        'Cannot update status of a cancelled order',
      );
    }

    order.status = dto.status;
    const savedOrder = await this.orderRepository.save(order);

    // Send notification based on status change
    await this.sendStatusChangeNotification(savedOrder);

    return savedOrder;
  }

  async deleteOrder(orderId: string) {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['user'],
    });
    if (!order) throw new NotFoundException('Order not found');

    // Send notification before deleting
    await this.notificationsQueue.add('send-notification', {
      userId: order.user.id,
      type: NotificationType.ORDER,
      title: 'Order Deleted',
      message: `Your order #${order.id.substring(0, 8).toUpperCase()} has been deleted.`,
      actionUrl: `/orders`,
      eventName: 'order.deleted',
    });

    return await this.orderRepository.softRemove(order);
  }

  private async sendStatusChangeNotification(order: Order) {
    const userId = order.user?.id;
    if (!userId) return;

    let title = '';
    let message = '';
    let type = NotificationType.ORDER;
    let eventName = '';

    switch (order.status) {
      case OrderStatus.CONFIRMED:
        title = 'Order Confirmed';
        message = `Your order #${order.id.substring(0, 8).toUpperCase()} has been confirmed by the seller.`;
        eventName = 'order.confirmed';
        break;
      case OrderStatus.SHIPPED:
        title = 'Order Shipped';
        message = `Your order #${order.id.substring(0, 8).toUpperCase()} has been shipped. Track your package for updates.`;
        type = NotificationType.DELIVERY;
        eventName = 'order.shipped';
        break;
      case OrderStatus.DELIVERED:
        title = 'Order Delivered';
        message = `Your order #${order.id.substring(0, 8).toUpperCase()} has been delivered successfully. Enjoy your purchase!`;
        type = NotificationType.DELIVERY;
        eventName = 'order.delivered';
        break;
      case OrderStatus.CANCELLED:
        title = 'Order Cancelled';
        message = `Your order #${order.id.substring(0, 8).toUpperCase()} has been cancelled.`;
        eventName = 'order.cancelled';
        break;
      default:
        return;
    }

    await this.notificationsQueue.add('send-notification', {
      userId,
      type,
      title,
      message,
      actionUrl: `/orders/${order.id}`,
      eventName,
    });
  }

  async getPublicOrderDetails(orderId: string) {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['items', 'items.product', 'user', 'user.profile'],
    });

    if (!order) throw new NotFoundException('Order not found');

    // Get customer name from user profile or user entity
    const customerName = order.user?.profile?.name || order.user?.email;

    // Return only safe, non-sensitive information
    return {
      orderId: order.id,
      status: order.status,
      totalAmount: order.totalAmount,
      tax: order.tax,
      paymentMethod: order.paymentMethod,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      customerName: customerName,
      customerEmail: order.user?.email || null,
      shippingAddress: {
        addressLine1: order.addressLine1,
        addressLine2: order.addressLine2,
        city: order.city,
        state: order.state,
        region: order.region,
        country: order.country,
      },
      items: order.items.map((item) => ({
        productName: item.product?.name || 'Unknown Product',
        quantity: item.quantity,
        price: item.price,
        total: Number(item.price) * item.quantity,
      })),
    };
  }

  async generateOrdersExcelReport(
    user: ITokenPayload,
    status?: OrderStatus,
    startDate?: Date,
    endDate?: Date,
    search?: string,
  ) {
    const query = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.user', 'user')
      .leftJoinAndSelect('user.profile', 'profile')
      .leftJoinAndSelect('order.partner', 'deliveryPartner')
      .leftJoinAndSelect('deliveryPartner.user', 'deliveryPartnerUser')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .leftJoinAndSelect('product.supplier', 'supplier');

    if (user.userType === UserType.SUPPLIER) {
      query
        .innerJoin('order.items', 'itemFilter')
        .innerJoin('itemFilter.product', 'productFilter')
        .andWhere('productFilter.supplier_id = :supplierId', {
          supplierId: user.id,
        });
    }

    if (status !== undefined) {
      query.andWhere('order.status = :status', { status });
    }

    if (startDate && endDate) {
      query.andWhere('order.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    if (search) {
      query.andWhere(
        '(user.name ILIKE :search OR user.email ILIKE :search OR order.id::text ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const orders = await query.orderBy('order.createdAt', 'DESC').getMany();

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Orders Report');

    // Define Column - hide Supplier column if user is Supplier
    const isSupplier = user.userType === UserType.SUPPLIER;

    worksheet.columns = [
      { header: 'Order Id', key: 'orderId', width: 20 },
      { header: 'Customer Name', key: 'customerName', width: 25 },
      { header: 'Customer Email', key: 'customerEmail', width: 30 },
      { header: 'Product Name', key: 'productName', width: 30 },
      ...(isSupplier
        ? []
        : [{ header: 'Supplier', key: 'supplier', width: 25 }]),
      { header: 'Quantity', key: 'quantity', width: 10 },
      { header: 'Price', key: 'price', width: 15 },
      { header: 'Total Amount', key: 'totalAmount', width: 15 },
      { header: 'Order Status', key: 'status', width: 15 },
      { header: 'Payment Method', key: 'paymentMethod', width: 18 },
      { header: 'Order Date', key: 'orderDate', width: 20 },
      { header: 'Delivery Partner', key: 'deliveryPartner', width: 25 },
      { header: 'Shipping Address', key: 'shippingAddress', width: 40 },
    ];

    worksheet.getRow(1).font = { bold: true, size: 12 };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF667EEA' },
    };
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // Add data rows
    const statusLabels: Record<number, string> = {
      1: 'Pending',
      2: 'Confirmed',
      3: 'Shipped',
      4: 'Delivered',
      5: 'Cancelled',
    };

    const paymentMethodLabels: Record<number, string> = {
      1: 'Cash on Delivery',
      2: 'Online Payment',
    };

    for (const order of orders) {
      for (const item of order.items) {
        const productSupplier = item.product?.supplier;
        const isSupplierProduct =
          user.userType === UserType.SUPPLIER
            ? productSupplier?.id === user.id
            : true;

        // Skip items not belonging to supplier if user is supplier
        if (user.userType === UserType.SUPPLIER && !isSupplierProduct) {
          continue;
        }

        const rowData: any = {
          orderId: order.id,
          customerName: order.user?.name || 'N/A',
          customerEmail: order.user?.email || 'N/A',
          productName: item.product?.name || 'Unknown Product',
          quantity: item.quantity,
          price: Number(item.price),
          totalAmount: Number(item.price) * item.quantity,
          status: statusLabels[order.status] || 'Unknown',
          paymentMethod: paymentMethodLabels[order.paymentMethod] || 'Unknown',
          orderDate: order.createdAt.toISOString(),
          deliveryPartner: order.partner?.user?.name || 'N/A',
          shippingAddress: `${order.addressLine1}${order.addressLine2 ? ', ' + order.addressLine2 : ''}, ${order.city}, ${order.state}, ${order.region}, ${order.country}`,
        };

        // Only add supplier column for non-supplier users
        if (!isSupplier) {
          rowData.supplier =
            productSupplier?.profile?.name || productSupplier?.email || 'N/A';
        }

        worksheet.addRow(rowData);
      }
    }

    // Add summary section at the bottom
    const lastRow = worksheet.rowCount;
    const summaryStartRow = lastRow + 2;

    worksheet.getCell(`A${summaryStartRow}`).value = 'Report Summary';
    worksheet.getCell(`A${summaryStartRow}`).font = { bold: true, size: 14 };
    worksheet.getCell(`A${summaryStartRow}`).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF764BA2' },
    };
    worksheet.getCell(`A${summaryStartRow}`).font = {
      bold: true,
      color: { argb: 'FFFFFFFF' },
    };

    worksheet.getCell(`A${summaryStartRow + 1}`).value = 'Total Orders:';
    worksheet.getCell(`B${summaryStartRow + 1}`).value = orders.length;
    worksheet.getCell(`A${summaryStartRow + 1}`).font = { bold: true };

    // Calculate total revenue (sum of order totalAmounts)
    const totalRevenue = orders.reduce(
      (sum, order) => sum + Number(order.totalAmount),
      0,
    );
    worksheet.getCell(`A${summaryStartRow + 2}`).value = 'Total Revenue:';
    worksheet.getCell(`B${summaryStartRow + 2}`).value = totalRevenue;
    worksheet.getCell(`B${summaryStartRow + 2}`).numFmt = '$#,##0.00';
    worksheet.getCell(`A${summaryStartRow + 2}`).font = { bold: true };

    // If supplier, show their specific totals
    if (user.userType === UserType.SUPPLIER) {
      let supplierTotalRevenue = 0;
      let supplierTotalItems = 0;

      for (const order of orders) {
        for (const item of order.items) {
          if (item.product?.supplier?.id === user.id) {
            supplierTotalRevenue += Number(item.price) * item.quantity;
            supplierTotalItems += item.quantity;
          }
        }
      }

      worksheet.getCell(`A${summaryStartRow + 3}`).value =
        'Your Products Revenue:';
      worksheet.getCell(`B${summaryStartRow + 3}`).value = supplierTotalRevenue;
      worksheet.getCell(`B${summaryStartRow + 3}`).numFmt = '$#,##0.00';
      worksheet.getCell(`A${summaryStartRow + 3}`).font = { bold: true };

      worksheet.getCell(`A${summaryStartRow + 4}`).value =
        'Your Products Sold:';
      worksheet.getCell(`B${summaryStartRow + 4}`).value = supplierTotalItems;
      worksheet.getCell(`A${summaryStartRow + 4}`).font = { bold: true };
    }

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async generateInvoice(order: Order): Promise<Buffer> {
    return await this.invoiceService.generateInvoice(order);
  }

  renderOrderDetailsHTML(order: {
    orderId: string;
    status: number;
    paymentMethod: number;
    tax: number;
    totalAmount: number;
    customerName?: string | null;
    customerEmail?: string | null;
    createdAt: string | Date;
    updatedAt: string | Date;
    shippingAddress?: {
      addressLine1?: string;
      addressLine2?: string;
      city?: string;
      state?: string;
      region?: string;
      country?: string;
    };
    items: Array<{
      productName: string;
      quantity: number;
      price: number;
      total: number;
    }>;
  }): string {
    const statusColors: Record<string, string> = {
      Pending: '#f59e0b',
      Confirmed: '#10b981',
      Shipped: '#3b82f6',
      Delivered: '#059669',
      Cancelled: '#ef4444',
    };
    const statusTexts: Record<number, string> = {
      0: 'Pending',
      1: 'Confirmed',
      2: 'Shipped',
      3: 'Delivered',
      4: 'Cancelled',
    };
    const statusText = statusTexts[order.status] || 'Unknown';
    const statusColor = statusColors[statusText] || '#6b7280';

    const itemsHtml = order.items
      .map(
        (item: any, index: number) => `
      <div class="item-row">
        <div class="item-info">
          <div class="item-index">${index + 1}</div>
          <div class="item-name">${item.productName}</div>
        </div>
        <div class="item-calc">
          <span class="item-unit">${item.quantity} × $${Number(item.price).toFixed(2)}</span>
          <span class="item-sum">$${item.total.toFixed(2)}</span>
        </div>
      </div>
    `,
      )
      .join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order #${order.orderId.substring(0, 8).toUpperCase()}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f3f4f6;
      padding: 16px;
      line-height: 1.5;
    }
    .card {
      background: white;
      border-radius: 16px;
      max-width: 600px;
      margin: 0 auto;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
    }
    .top {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 24px;
      text-align: center;
    }
    .top h1 { font-size: 20px; font-weight: 600; margin-bottom: 4px; }
    .top p { font-size: 13px; opacity: 0.9; }
    .badge {
      display: inline-block;
      margin-top: 12px;
      padding: 6px 16px;
      background: ${statusColor};
      color: white;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .body { padding: 20px; }
    .section { margin-bottom: 20px; }
    .section:last-child { margin-bottom: 0; }
    .section-title {
      font-size: 11px;
      font-weight: 600;
      color: #667eea;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 10px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #f3f4f6;
    }
    .info-row:last-child { border-bottom: none; }
    .info-label { color: #6b7280; font-size: 14px; }
    .info-value { color: #111827; font-size: 14px; font-weight: 500; }
    .address-box {
      background: #f9fafb;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 14px;
      color: #374151;
      line-height: 1.6;
    }
    .item-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid #f3f4f6;
    }
    .item-row:last-child { border-bottom: none; }
    .item-info { display: flex; align-items: center; gap: 10px; flex: 1; }
    .item-index {
      width: 24px;
      height: 24px;
      background: #e0e7ff;
      color: #667eea;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 700;
      flex-shrink: 0;
    }
    .item-name { font-size: 14px; color: #111827; font-weight: 500; }
    .item-calc { text-align: right; }
    .item-unit { display: block; font-size: 12px; color: #6b7280; margin-bottom: 2px; }
    .item-sum { display: block; font-size: 15px; font-weight: 600; color: #667eea; }
    .total-box {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 12px;
      text-align: center;
      margin-top: 16px;
    }
    .total-amount { font-size: 32px; font-weight: 700; }
    .total-label { font-size: 13px; opacity: 0.9; margin-top: 4px; }
    .footer {
      text-align: center;
      padding: 16px;
      font-size: 12px;
      color: #9ca3af;
      background: #f9fafb;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="top">
      <h1>Order Details</h1>
      <p>#${order.orderId.substring(0, 14).toUpperCase()}</p>
      <div class="badge">${statusText}</div>
    </div>
    
    <div class="body">
      <div class="section">
        <div class="section-title">Customer Information</div>
        <div class="info-row">
          <span class="info-label">Customer Name</span>
          <span class="info-value">${order?.customerName || 'N/A'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Email</span>
          <span class="info-value">${order?.customerEmail || 'N/A'}</span>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Order Information</div>
        <div class="info-row">
          <span class="info-label">Order Date</span>
          <span class="info-value">${this.formatDisplayDate(order.createdAt)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Last Updated</span>
          <span class="info-value">${this.formatDisplayDate(order.updatedAt)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Payment Method</span>
          <span class="info-value">${order?.paymentMethod === 0 ? 'Cash on Delivery' : 'Online Payment'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Tax</span>
          <span class="info-value">$${Number(order?.tax).toFixed(2)}</span>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Shipping Address</div>
        <div class="address-box">
          ${order?.shippingAddress?.addressLine1}${order?.shippingAddress?.addressLine2 ? ', ' + order?.shippingAddress?.addressLine2 : ''}<br>
          ${order?.shippingAddress?.city}, ${order?.shippingAddress?.state} ${order?.shippingAddress?.region}<br>
          ${order?.shippingAddress?.country}
        </div>
      </div>

      <div class="section">
        <div class="section-title">Items (${order.items.length})</div>
        ${itemsHtml}
      </div>

      <div class="total-box">
        <div class="total-amount">$${Number(order?.totalAmount).toFixed(2)}</div>
        <div class="total-label">Grand Total</div>
      </div>
    </div>

    <div class="footer">
      Thank you for shopping with us!
    </div>
  </div>
</body>
</html>`;
  }
}
