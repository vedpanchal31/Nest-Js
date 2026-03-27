import { Test, TestingModule } from '@nestjs/testing';
import { OrderService } from '../orders.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Order } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { Repository, DataSource } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CartService } from '../../cart/cart.service';
import { DeliveryPartnerService } from '../../delivery-partners/delivery-partners.service';
import { InvoiceService } from '../../../core/services/invoice.service';
import { OrderStatus, PaymentMethod, UserType } from '../../../core/constants/app.constants';
import { getQueueToken } from '@nestjs/bull';

describe('OrderService - Comprehensive', () => {
  let service: OrderService;
  let orderRepository: jest.Mocked<Repository<Order>>;
  let cartService: jest.Mocked<CartService>;
  let dataSource: jest.Mocked<DataSource>;
  let deliveryService: jest.Mocked<DeliveryPartnerService>;
  let invoiceService: jest.Mocked<InvoiceService>;
  let notificationsQueue: jest.Mocked<any>;

  const mockUserToken = {
    id: 'user-uuid',
    email: 'user@example.com',
    type: 1,
    userType: UserType.USER,
  };

  const mockAdminToken = {
    id: 'admin-uuid',
    email: 'admin@example.com',
    type: 2,
    userType: UserType.ADMIN,
  };

  const mockSupplierToken = {
    id: 'supplier-uuid',
    email: 'supplier@example.com',
    type: 2,
    userType: UserType.SUPPLIER,
  };

  const mockOrder = {
    id: 'order-uuid',
    userId: 'user-uuid',
    status: OrderStatus.PENDING,
    paymentMethod: PaymentMethod.CASH_ON_DELIVERY,
    totalAmount: 199.98,
    tax: 0,
    addressLine1: '123 Main St',
    city: 'New York',
    state: 'NY',
    region: 'Manhattan',
    country: 'USA',
    latitude: 40.7128,
    longitude: -74.006,
    items: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as Order;

  const mockCartItem = {
    id: 'cart-item-uuid',
    product: { id: 'product-uuid', name: 'Test Product', price: 99.99 },
    quantity: 2,
  } as any;

  const mockQueryRunner = {
    connect: jest.fn().mockResolvedValue(undefined),
    startTransaction: jest.fn().mockResolvedValue(undefined),
    commitTransaction: jest.fn().mockResolvedValue(undefined),
    rollbackTransaction: jest.fn().mockResolvedValue(undefined),
    release: jest.fn().mockResolvedValue(undefined),
    manager: {
      create: jest.fn().mockReturnValue(mockOrder),
      save: jest.fn().mockResolvedValue(mockOrder),
    },
  };

  const mockOrderRepository = {
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    save: jest.fn().mockResolvedValue(mockOrder),
    softRemove: jest.fn().mockResolvedValue(mockOrder),
    createQueryBuilder: jest.fn().mockReturnValue({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[mockOrder], 1]),
      getOne: jest.fn().mockResolvedValue(mockOrder),
      getMany: jest.fn().mockResolvedValue([mockOrder]),
    }),
  };

  const mockCartService = {
    getCart: jest.fn(),
    clearCart: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  const mockDataSource = {
    createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
  };

  const mockDeliveryService = {
    dispatchOrder: jest.fn().mockResolvedValue(undefined),
  };

  const mockInvoiceService = {
    generateInvoice: jest.fn().mockResolvedValue(Buffer.from('pdf-content')),
  };

  const mockNotificationsQueue = {
    add: jest.fn().mockResolvedValue(undefined),
  };

  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeAll(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
  });

  afterAll(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        {
          provide: getRepositoryToken(Order),
          useValue: mockOrderRepository,
        },
        {
          provide: CartService,
          useValue: mockCartService,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: DeliveryPartnerService,
          useValue: mockDeliveryService,
        },
        {
          provide: InvoiceService,
          useValue: mockInvoiceService,
        },
        {
          provide: getQueueToken('notifications'),
          useValue: mockNotificationsQueue,
        },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
    orderRepository = module.get(getRepositoryToken(Order));
    cartService = module.get(CartService);
    dataSource = module.get(DataSource);
    deliveryService = module.get(DeliveryPartnerService);
    invoiceService = module.get(InvoiceService);
    notificationsQueue = module.get(getQueueToken('notifications'));
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createOrder - Business Logic', () => {
    const createOrderDto = {
      addressLine1: '123 Main St',
      city: 'New York',
      state: 'NY',
      region: 'Manhattan',
      country: 'USA',
      latitude: 40.7128,
      longitude: -74.006,
      paymentMethod: PaymentMethod.CASH_ON_DELIVERY,
    };

    it('should throw BadRequestException when cart is empty', async () => {
      cartService.getCart.mockResolvedValue({ data: [], totalItems: 0, totalPages: 0, currentPage: 1 });

      await expect(service.createOrder('user-uuid', createOrderDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should create order with CASH_ON_DELIVERY as CONFIRMED status', async () => {
      cartService.getCart.mockResolvedValue({
        data: [mockCartItem],
        totalItems: 1,
        totalPages: 1,
        currentPage: 1,
      });

      const dto = { ...createOrderDto, paymentMethod: PaymentMethod.CASH_ON_DELIVERY };
      const result = await service.createOrder('user-uuid', dto);

      expect(mockQueryRunner.manager.create).toHaveBeenCalledWith(
        Order,
        expect.objectContaining({
          status: OrderStatus.CONFIRMED,
          totalAmount: 199.98,
        }),
      );
    });

    it('should create order with ONLINE_PAYMENT as PENDING status', async () => {
      cartService.getCart.mockResolvedValue({
        data: [mockCartItem],
        totalItems: 1,
        totalPages: 1,
        currentPage: 1,
      });

      const dto = { ...createOrderDto, paymentMethod: 2 };
      await service.createOrder('user-uuid', dto);

      expect(mockQueryRunner.manager.create).toHaveBeenCalledWith(
        Order,
        expect.objectContaining({
          status: OrderStatus.PENDING,
        }),
      );
    });

    it('should calculate correct total amount from cart items', async () => {
      cartService.getCart.mockResolvedValue({
        data: [
          { ...mockCartItem, quantity: 3, product: { ...mockCartItem.product, price: 50 } as any },
        ],
        totalItems: 1,
        totalPages: 1,
        currentPage: 1,
      });

      await service.createOrder('user-uuid', createOrderDto);

      expect(mockQueryRunner.manager.create).toHaveBeenCalledWith(
        Order,
        expect.objectContaining({
          totalAmount: 150,
        }),
      );
    });

    it('should clear cart after successful order creation', async () => {
      cartService.getCart.mockResolvedValue({
        data: [mockCartItem],
        totalItems: 1,
        totalPages: 1,
        currentPage: 1,
      });

      await service.createOrder('user-uuid', createOrderDto);

      expect(cartService.clearCart).toHaveBeenCalledWith('user-uuid');
    });

    it('should dispatch order for delivery after creation', async () => {
      cartService.getCart.mockResolvedValue({
        data: [mockCartItem],
        totalItems: 1,
        totalPages: 1,
        currentPage: 1,
      });

      await service.createOrder('user-uuid', createOrderDto);

      expect(deliveryService.dispatchOrder).toHaveBeenCalledWith(
        mockOrder.id,
        expect.any(Number),
        expect.any(Number),
      );
    });

    it('should send notification after order creation', async () => {
      cartService.getCart.mockResolvedValue({
        data: [mockCartItem],
        totalItems: 1,
        totalPages: 1,
        currentPage: 1,
      });

      await service.createOrder('user-uuid', createOrderDto);

      expect(notificationsQueue.add).toHaveBeenCalledWith(
        'send-notification',
        expect.objectContaining({
          userId: 'user-uuid',
          type: 'order',
          title: 'Order Placed Successfully',
        }),
      );
    });

    it('should rollback transaction on error', async () => {
      cartService.getCart.mockResolvedValue({
        data: [mockCartItem],
        totalItems: 1,
        totalPages: 1,
        currentPage: 1,
      });
      mockQueryRunner.manager.save.mockRejectedValue(new Error('DB Error'));

      await expect(service.createOrder('user-uuid', createOrderDto)).rejects.toThrow('DB Error');
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });

  describe('getAllOrders - Pagination', () => {
    it('should return paginated orders for user', async () => {
      orderRepository.findAndCount.mockResolvedValue([[mockOrder], 1]);

      const result = await service.getAllOrders('user-uuid', 1, 10);

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page');
      expect(result).toHaveProperty('limit');
      expect(result).toHaveProperty('totalPages');
    });

    it('should filter by user id', async () => {
      orderRepository.findAndCount.mockResolvedValue([[mockOrder], 1]);

      await service.getAllOrders('specific-user', 1, 10);

      expect(orderRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { user: { id: 'specific-user' } },
        }),
      );
    });

    it('should include order items with products', async () => {
      orderRepository.findAndCount.mockResolvedValue([[mockOrder], 1]);

      await service.getAllOrders('user-uuid', 1, 10);

      expect(orderRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          relations: ['items', 'items.product'],
        }),
      );
    });
  });

  describe('getOrderSummary - Authorization', () => {
    it('should return order with items for owner', async () => {
      orderRepository.findOne.mockResolvedValue(mockOrder);

      const result = await service.getOrderSummary('order-uuid', 'user-uuid');

      expect(result).toEqual(mockOrder);
    });

    it('should throw NotFoundException when order not found', async () => {
      orderRepository.findOne.mockResolvedValue(null);

      await expect(service.getOrderSummary('non-existent', 'user-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when order belongs to different user', async () => {
      orderRepository.findOne.mockResolvedValue(null);

      await expect(service.getOrderSummary('order-uuid', 'different-user')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('cancelOrder - Status Validation', () => {
    it('should cancel PENDING order', async () => {
      orderRepository.findOne.mockResolvedValue({ ...mockOrder, status: OrderStatus.PENDING });
      const saveSpy = jest.fn().mockResolvedValue({ ...mockOrder, status: OrderStatus.CANCELLED });
      orderRepository.save = saveSpy;

      const result = await service.cancelOrder('order-uuid', 'user-uuid');

      expect(saveSpy).toHaveBeenCalledWith(expect.objectContaining({ status: OrderStatus.CANCELLED }));
    });

    it('should cancel CONFIRMED order', async () => {
      orderRepository.findOne.mockResolvedValue({ ...mockOrder, status: OrderStatus.CONFIRMED });
      const saveSpy = jest.fn().mockResolvedValue({ ...mockOrder, status: OrderStatus.CANCELLED });
      orderRepository.save = saveSpy;

      await service.cancelOrder('order-uuid', 'user-uuid');

      expect(saveSpy).toHaveBeenCalledWith(expect.objectContaining({ status: OrderStatus.CANCELLED }));
    });

    it('should throw BadRequestException when order already SHIPPED', async () => {
      orderRepository.findOne.mockResolvedValue({ ...mockOrder, status: OrderStatus.SHIPPED });

      await expect(service.cancelOrder('order-uuid', 'user-uuid')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when order already DELIVERED', async () => {
      orderRepository.findOne.mockResolvedValue({ ...mockOrder, status: OrderStatus.DELIVERED });

      await expect(service.cancelOrder('order-uuid', 'user-uuid')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should send cancellation notification', async () => {
      orderRepository.findOne.mockResolvedValue({ ...mockOrder, status: OrderStatus.PENDING });
      orderRepository.save.mockResolvedValue({ ...mockOrder, status: OrderStatus.CANCELLED });

      await service.cancelOrder('order-uuid', 'user-uuid');

      expect(notificationsQueue.add).toHaveBeenCalledWith(
        'send-notification',
        expect.objectContaining({
          title: 'Order Cancelled',
          eventName: 'order.cancelled',
        }),
      );
    });
  });

  describe('getManagementOrders - Role-based Filtering', () => {
    it('should return all orders for ADMIN', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockOrder], 1]),
      };
      orderRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await service.getManagementOrders(mockAdminToken, 1, 10);

      expect(mockQueryBuilder.innerJoin).not.toHaveBeenCalled();
    });

    it('should filter by status when provided', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockOrder], 1]),
      };
      orderRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await service.getManagementOrders(mockAdminToken, 1, 10, OrderStatus.SHIPPED);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'order.status = :status',
        { status: OrderStatus.SHIPPED },
      );
    });

    it('should filter by date range when provided', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockOrder], 1]),
      };
      orderRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      await service.getManagementOrders(mockAdminToken, 1, 10, undefined, startDate, endDate);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'order.createdAt BETWEEN :startDate AND :endDate',
        { startDate, endDate },
      );
    });
  });

  describe('updateOrderStatus - Validation', () => {
    it('should throw BadRequestException when updating CANCELLED order', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({ ...mockOrder, status: OrderStatus.CANCELLED }),
      };
      orderRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await expect(
        service.updateOrderStatus('order-uuid', { status: OrderStatus.CONFIRMED }, mockAdminToken),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update status and send notification', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({ ...mockOrder, status: OrderStatus.PENDING }),
      };
      orderRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);
      const saveSpy = jest.fn().mockResolvedValue({ ...mockOrder, status: OrderStatus.SHIPPED });
      orderRepository.save = saveSpy;

      await service.updateOrderStatus('order-uuid', { status: OrderStatus.SHIPPED }, mockAdminToken);

      expect(saveSpy).toHaveBeenCalledWith(expect.objectContaining({ status: OrderStatus.SHIPPED }));
    });
  });

  describe('deleteOrder - Authorization', () => {
    it('should soft remove order and send notification', async () => {
      orderRepository.findOne.mockResolvedValue({
        ...mockOrder,
        user: { id: 'user-uuid' },
      } as any);

      await service.deleteOrder('order-uuid');

      expect(orderRepository.softRemove).toHaveBeenCalled();
      expect(notificationsQueue.add).toHaveBeenCalledWith(
        'send-notification',
        expect.objectContaining({
          title: 'Order Deleted',
          eventName: 'order.deleted',
        }),
      );
    });

    it('should throw NotFoundException when order not found', async () => {
      orderRepository.findOne.mockResolvedValue(null);

      await expect(service.deleteOrder('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getPublicOrderDetails', () => {
    it('should return safe order details without sensitive info', async () => {
      orderRepository.findOne.mockResolvedValue({
        ...mockOrder,
        user: { id: 'user-uuid', email: 'user@example.com', profile: { name: 'John Doe' } },
        items: [{ product: { name: 'Product 1' }, quantity: 2, price: 50 }],
      } as any);

      const result = await service.getPublicOrderDetails('order-uuid');

      expect(result).toHaveProperty('orderId');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('totalAmount');
      expect(result).toHaveProperty('customerName');
      expect(result).toHaveProperty('shippingAddress');
      expect(result).toHaveProperty('items');
      expect(result).not.toHaveProperty('user');
    });

    it('should throw NotFoundException when order not found', async () => {
      orderRepository.findOne.mockResolvedValue(null);

      await expect(service.getPublicOrderDetails('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
