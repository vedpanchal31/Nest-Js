import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
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

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly cartService: CartService,
    private readonly dataSource: DataSource,
    private readonly deliveryService: DeliveryPartnerService,
  ) {}

  async createOrder(userId: string, dto: CreateOrderDto) {
    const cartResponse = await this.cartService.getCart(userId, 1, 100);
    const cartItems = cartResponse.data;

    if (!cartItems || cartItems.length === 0) {
      throw new BadRequestException(
        'Can not place an order with an empty cart',
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
      await this.cartService.clearCart(userId);
      await queryRunner.commitTransaction();

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
      relations: ['items', 'items.product'],
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
    return await this.orderRepository.save(order);
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
    return await this.orderRepository.save(order);
  }

  async deleteOrder(orderId: string) {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException('Order not found');
    return await this.orderRepository.softRemove(order);
  }
}
