import { Test, TestingModule } from '@nestjs/testing';
import { OrderManagementController } from '../order-management.controller';
import { OrderService } from '../orders.service';
import { UserType } from '../../../core/constants/app.constants';
import { AuthGuard } from '../../../core/guards/auth.guard';
import { RoleGuard } from '../../../core/guards/role.guard';

jest.mock('../../../core/guards/auth.guard', () => ({
  AuthGuard: jest.fn().mockImplementation(() => ({
    canActivate: jest.fn().mockReturnValue(true),
  })),
}));

jest.mock('../../../core/guards/role.guard', () => ({
  RoleGuard: jest.fn().mockImplementation(() => ({
    canActivate: jest.fn().mockReturnValue(true),
  })),
}));

describe('OrderManagementController - Comprehensive', () => {
  let controller: OrderManagementController;
  let service: jest.Mocked<OrderService>;

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
    status: 1,
    totalAmount: 199.98,
    user: { id: 'user-uuid', name: 'Test User' },
    items: [],
  };

  const mockOrdersService = {
    getManagementOrders: jest.fn().mockResolvedValue({
      data: [mockOrder],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    }),
    getManagementOrderDetails: jest.fn().mockResolvedValue(mockOrder),
    updateOrderStatus: jest.fn().mockResolvedValue({ ...mockOrder, status: 2 }),
    deleteOrder: jest.fn().mockResolvedValue(mockOrder),
    generateOrdersExcelReport: jest
      .fn()
      .mockResolvedValue(Buffer.from('excel-content')),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrderManagementController],
      providers: [
        {
          provide: OrderService,
          useValue: mockOrdersService,
        },
      ],
    }).compile();

    controller = module.get<OrderManagementController>(
      OrderManagementController,
    );
    service = module.get(OrderService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getManagementOrders - Query Parameter Validation', () => {
    it('should call service with default pagination', async () => {
      await controller.getManagementOrders({ user: mockAdminToken }, 1, 10);

      expect(service.getManagementOrders).toHaveBeenCalledWith(
        mockAdminToken,
        1,
        10,
        undefined,
        undefined,
        undefined,
        undefined,
      );
    });

    it('should pass all filter parameters', async () => {
      await controller.getManagementOrders(
        { user: mockAdminToken },
        2,
        20,
        3,
        '2024-01-01',
        '2024-12-31',
        'search-term',
      );

      expect(service.getManagementOrders).toHaveBeenCalledWith(
        mockAdminToken,
        2,
        20,
        3,
        expect.any(Date),
        expect.any(Date),
        'search-term',
      );
    });

    it('should pass supplier token for filtering', async () => {
      await controller.getManagementOrders({ user: mockSupplierToken }, 1, 10);

      expect(service.getManagementOrders).toHaveBeenCalledWith(
        mockSupplierToken,
        1,
        10,
        undefined,
        undefined,
        undefined,
        undefined,
      );
    });
  });

  describe('getManagementOrderDetails - Route Parameter', () => {
    it('should pass order id and user token', async () => {
      await controller.getManagementOrderDetails(
        { user: mockAdminToken },
        'order-uuid',
      );

      expect(service.getManagementOrderDetails).toHaveBeenCalledWith(
        'order-uuid',
        mockAdminToken,
      );
    });

    it('should return order details', async () => {
      const result = await controller.getManagementOrderDetails(
        { user: mockAdminToken },
        'order-uuid',
      );

      expect(result).toEqual(mockOrder);
    });
  });

  describe('updateOrderStatus - Route Parameter and Body', () => {
    it('should update order status', async () => {
      const dto = { status: 2 };

      await controller.updateOrderStatus(
        { user: mockAdminToken },
        'order-uuid',
        dto,
      );

      expect(service.updateOrderStatus).toHaveBeenCalledWith(
        'order-uuid',
        dto,
        mockAdminToken,
      );
    });

    it('should return updated order', async () => {
      const dto = { status: 2 };

      const result = await controller.updateOrderStatus(
        { user: mockAdminToken },
        'order-uuid',
        dto,
      );

      expect(result.status).toBe(2);
    });
  });

  describe('deleteOrder - Route Parameter', () => {
    it('should pass order id to service', async () => {
      await controller.deleteOrder('order-uuid');

      expect(service.deleteOrder).toHaveBeenCalledWith('order-uuid');
    });

    it('should return deleted order', async () => {
      const result = await controller.deleteOrder('order-uuid');

      expect(result).toEqual(mockOrder);
    });
  });

  describe('downloadOrdersReport - Excel Report Download', () => {
    it('should handle report generation error', async () => {
      service.generateOrdersExcelReport.mockRejectedValue(
        new Error('Report generation failed'),
      );

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;

      await controller.downloadOrdersReport({ user: mockAdminToken }, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: false,
        message: 'Report generation failed',
      });
    });
  });
});
