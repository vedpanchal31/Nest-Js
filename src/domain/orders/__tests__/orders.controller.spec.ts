import { Test, TestingModule } from '@nestjs/testing';
import { OrdersController } from '../orders.controller';
import { OrderService } from '../orders.service';
import { UserType } from '../../../core/constants/app.constants';
import { AuthGuard } from '../../../core/guards/auth.guard';

jest.mock('../../../core/guards/auth.guard', () => ({
  AuthGuard: jest.fn().mockImplementation(() => ({
    canActivate: jest.fn().mockReturnValue(true),
  })),
}));

describe('OrdersController - Comprehensive', () => {
  let controller: OrdersController;
  let service: jest.Mocked<OrderService>;

  const mockUserToken = {
    id: 'user-uuid',
    email: 'user@example.com',
    type: 1,
    userType: UserType.USER,
  };

  const mockOrder = {
    id: 'order-uuid',
    userId: 'user-uuid',
    status: 1,
    paymentMethod: 1,
    totalAmount: 199.98,
    addressLine1: '123 Main St',
    city: 'New York',
    state: 'NY',
    region: 'Manhattan',
    country: 'USA',
    latitude: 40.7128,
    longitude: -74.006,
    items: [],
  };

  const mockOrdersService = {
    createOrder: jest.fn().mockResolvedValue(mockOrder),
    getAllOrders: jest.fn().mockResolvedValue({
      data: [mockOrder],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    }),
    getOrderSummary: jest.fn().mockResolvedValue(mockOrder),
    cancelOrder: jest.fn().mockResolvedValue({ ...mockOrder, status: 5 }),
    generateInvoice: jest.fn().mockResolvedValue(Buffer.from('pdf-content')),
    getPublicOrderDetails: jest.fn().mockResolvedValue({
      orderId: 'order-uuid',
      status: 1,
      totalAmount: 199.98,
    }),
    renderOrderDetailsHTML: jest.fn().mockReturnValue('<html>Order Details</html>'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        {
          provide: OrderService,
          useValue: mockOrdersService,
        },
      ],
    }).compile();

    controller = module.get<OrdersController>(OrdersController);
    service = module.get(OrderService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createOrder - Request Body Validation', () => {
    it('should successfully create order with valid data', async () => {
      const dto = {
        addressLine1: '123 Main St',
        city: 'New York',
        state: 'NY',
        region: 'Manhattan',
        country: 'USA',
        latitude: 40.7128,
        longitude: -74.006,
        paymentMethod: 1,
      };

      const result = await controller.createOrder({ user: mockUserToken } as any, dto as any);

      expect(result).toEqual(mockOrder);
      expect(service.createOrder).toHaveBeenCalledWith('user-uuid', dto);
    });

    it('should pass user id from token', async () => {
      const dto = { addressLine1: 'Test', city: 'City', state: 'ST', region: 'Region', country: 'Country', latitude: 0, longitude: 0, paymentMethod: 1 };

      await controller.createOrder({ user: { id: 'different-user' } } as any, dto as any);

      expect(service.createOrder).toHaveBeenCalledWith('different-user', dto);
    });
  });

  describe('getAllOrders - Query Parameter Validation', () => {
    it('should call service with default pagination', async () => {
      await controller.getAllOrders({ user: mockUserToken } as any, 1, 10);

      expect(service.getAllOrders).toHaveBeenCalledWith('user-uuid', 1, 10);
    });

    it('should pass custom pagination values', async () => {
      await controller.getAllOrders({ user: mockUserToken } as any, 2, 20);

      expect(service.getAllOrders).toHaveBeenCalledWith('user-uuid', 2, 20);
    });

    it('should return paginated orders', async () => {
      const result = await controller.getAllOrders({ user: mockUserToken } as any, 1, 10);

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page');
      expect(result).toHaveProperty('limit');
      expect(result).toHaveProperty('totalPages');
    });
  });

  describe('getOrderSummary - Route Parameter', () => {
    it('should pass order id to service', async () => {
      await controller.getOrderSummary({ user: mockUserToken } as any, 'order-uuid');

      expect(service.getOrderSummary).toHaveBeenCalledWith('order-uuid', 'user-uuid');
    });

    it('should pass user id for authorization', async () => {
      await controller.getOrderSummary({ user: { id: 'auth-user' } } as any, 'order-uuid');

      expect(service.getOrderSummary).toHaveBeenCalledWith('order-uuid', 'auth-user');
    });

    it('should return order details', async () => {
      const result = await controller.getOrderSummary({ user: mockUserToken } as any, 'order-uuid');

      expect(result).toEqual(mockOrder);
    });
  });

  describe('cancelOrder - Route Parameter', () => {
    it('should pass order id to service', async () => {
      await controller.cancelOrder({ user: mockUserToken } as any, 'order-uuid');

      expect(service.cancelOrder).toHaveBeenCalledWith('order-uuid', 'user-uuid');
    });

    it('should return cancelled order', async () => {
      const result = await controller.cancelOrder({ user: mockUserToken } as any, 'order-uuid');

      expect(result.status).toBe(5);
    });
  });

  describe('downloadInvoice - Invoice Download', () => {
    it('should handle invoice download error', async () => {
      service.getOrderSummary.mockRejectedValue(new Error('Order not found'));

      const mockRes = {
        set: jest.fn().mockReturnThis(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;

      await controller.downloadInvoice({ user: mockUserToken } as any, 'order-uuid', mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: false,
        message: 'Order not found',
      });
    });
  });

  describe('getPublicOrderDetails - Public Order Page', () => {
    it('should return public order details HTML', async () => {
      service.getPublicOrderDetails.mockResolvedValue(mockOrder);
      service.renderOrderDetailsHTML.mockReturnValue('<html>Order Details</html>');

      const mockRes = {
        setHeader: jest.fn().mockReturnThis(),
        send: jest.fn(),
      } as any;

      await controller.getPublicOrderDetails('order-uuid', mockRes);

      expect(service.getPublicOrderDetails).toHaveBeenCalledWith('order-uuid');
      expect(service.renderOrderDetailsHTML).toHaveBeenCalledWith(mockOrder);
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/html');
      expect(mockRes.send).toHaveBeenCalledWith('<html>Order Details</html>');
    });
  });
});
