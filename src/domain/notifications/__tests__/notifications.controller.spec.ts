import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from '../notifications.controller';
import { NotificationsService } from '../notifications.service';
import { UserType } from '../../../core/constants/app.constants';
import { AuthGuard } from '../../../core/guards/auth.guard';
import { NotificationType } from '../entities/notification.entity';

jest.mock('../../../core/guards/auth.guard', () => ({
  AuthGuard: jest.fn().mockImplementation(() => ({
    canActivate: jest.fn().mockReturnValue(true),
  })),
}));

describe('NotificationsController - Comprehensive', () => {
  let controller: NotificationsController;
  let service: jest.Mocked<NotificationsService>;

  const mockUserToken = {
    id: 'user-uuid',
    email: 'user@example.com',
    type: 1,
    userType: UserType.USER,
  };

  const mockNotification = {
    id: 'notification-uuid',
    userId: 'user-uuid',
    type: NotificationType.ORDER,
    title: 'Order Confirmed',
    message: 'Your order has been confirmed',
    actionUrl: '/orders/123',
    isRead: false,
    createdAt: new Date(),
  };

  const mockNotificationsService = {
    findAll: jest.fn().mockResolvedValue({
      data: [mockNotification],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    }),
    processAction: jest.fn().mockResolvedValue({ message: 'Action completed' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
      ],
    }).compile();

    controller = module.get<NotificationsController>(NotificationsController);
    service = module.get(NotificationsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll - Query Parameters', () => {
    it('should return paginated notifications with user id from token', async () => {
      const query = { page: 1, limit: 10 };

      const result = await controller.findAll({ user: mockUserToken } as any, query as any);

      expect(service.findAll).toHaveBeenCalledWith({
        ...query,
        userId: 'user-uuid',
      });
      expect(result.data).toEqual([mockNotification]);
    });

    it('should pass all query parameters to service', async () => {
      const query = {
        page: 2,
        limit: 20,
        type: NotificationType.PAYMENT,
        isRead: false,
        orderBy: 'createdAt',
        sortDir: 'desc' as const,
      };

      await controller.findAll({ user: mockUserToken } as any, query as any);

      expect(service.findAll).toHaveBeenCalledWith({
        ...query,
        userId: 'user-uuid',
      });
    });

    it('should override userId from query with token user id', async () => {
      const query = { page: 1, limit: 10, userId: 'different-user' };

      await controller.findAll({ user: mockUserToken } as any, query as any);

      expect(service.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-uuid',
        }),
      );
    });

    it('should return paginated response structure', async () => {
      const result = await controller.findAll({ user: mockUserToken } as any, { page: 1, limit: 10 } as any);

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page');
      expect(result).toHaveProperty('limit');
      expect(result).toHaveProperty('totalPages');
    });
  });

  describe('processAction - Batch Operations', () => {
    it('should process read action with notification ids', async () => {
      const actionDto = { type: 1, ids: ['notif-1', 'notif-2'] };

      const result = await controller.processAction({ user: mockUserToken } as any, actionDto as any);

      expect(service.processAction).toHaveBeenCalledWith('user-uuid', 1, ['notif-1', 'notif-2']);
      expect(result).toEqual({ message: 'Action completed' });
    });

    it('should process delete action', async () => {
      const actionDto = { type: 2, ids: ['notif-1'] };

      await controller.processAction({ user: mockUserToken } as any, actionDto as any);

      expect(service.processAction).toHaveBeenCalledWith('user-uuid', 2, ['notif-1']);
    });

    it('should process delete all action (no ids needed)', async () => {
      const actionDto = { type: 3 };

      await controller.processAction({ user: mockUserToken } as any, actionDto as any);

      expect(service.processAction).toHaveBeenCalledWith('user-uuid', 3, undefined);
    });

    it('should process read all action (no ids needed)', async () => {
      const actionDto = { type: 4 };

      await controller.processAction({ user: mockUserToken } as any, actionDto as any);

      expect(service.processAction).toHaveBeenCalledWith('user-uuid', 4, undefined);
    });

    it('should pass user id from token for authorization', async () => {
      const actionDto = { type: 1, ids: ['notif-1'] };

      await controller.processAction({ user: { id: 'specific-user' } } as any, actionDto as any);

      expect(service.processAction).toHaveBeenCalledWith('specific-user', expect.any(Number), expect.any(Array));
    });
  });
});
