/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, CanActivate } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { UserType } from '../src/core/constants/app.constants';
import { NotificationsController } from '../src/domain/notifications/notifications.controller';
import { NotificationsService } from '../src/domain/notifications/notifications.service';
import { AuthGuard } from '../src/core/guards/auth.guard';
import { NotificationType, NotificationStatus } from '../src/domain/notifications/entities/notification.entity';

describe('NotificationsController (e2e)', () => {
  let app: INestApplication<App>;

  const mockNotification = {
    id: 'notification-uuid',
    userId: 'user-uuid',
    type: NotificationType.ORDER,
    title: 'Order Confirmed',
    message: 'Your order has been confirmed',
    actionUrl: '/orders/123',
    status: NotificationStatus.UNREAD,
    isRead: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockNotificationsService = {
    findAll: jest.fn().mockResolvedValue({
      data: [mockNotification],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    }),
    processAction: jest.fn().mockResolvedValue({ message: 'Action completed successfully' }),
  };

  const mockAuthGuard: CanActivate = {
    canActivate: jest.fn().mockImplementation((context) => {
      const req = context.switchToHttp().getRequest();
      req.user = {
        id: 'user-uuid',
        email: 'user@example.com',
        type: 1,
        userType: UserType.USER,
      };
      return true;
    }),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue(mockAuthGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await app.init();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
    jest.clearAllMocks();
  });

  describe('GET /notifications', () => {
    it('should return paginated notifications', async () => {
      const response = await request(app.getHttpServer())
        .get('/notifications?page=1&limit=10')
        .set('Authorization', 'Bearer mock-jwt-token')
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.total).toBe(1);
      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(10);
    });

    it('should apply type filter', async () => {
      await request(app.getHttpServer())
        .get('/notifications?page=1&limit=10&type=order')
        .set('Authorization', 'Bearer mock-jwt-token')
        .expect(200);

      expect(mockNotificationsService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'order' }),
      );
    });

    it('should apply isRead filter', async () => {
      await request(app.getHttpServer())
        .get('/notifications?page=1&limit=10&isRead=false')
        .set('Authorization', 'Bearer mock-jwt-token')
        .expect(200);

      expect(mockNotificationsService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ isRead: false }),
      );
    });

    it('should override userId from query with token user id', async () => {
      await request(app.getHttpServer())
        .get('/notifications?page=1&limit=10&userId=550e8400-e29b-41d4-a716-446655440099')
        .set('Authorization', 'Bearer mock-jwt-token')
        .expect(200);

      expect(mockNotificationsService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-uuid' }),
      );
    });
  });

  describe('PATCH /notifications - Read Action', () => {
    it('should mark notifications as read', async () => {
      const response = await request(app.getHttpServer())
        .patch('/notifications')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send({ type: 1, ids: ['550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002'] })
        .expect(200);

      expect(response.body.message).toBe('Action completed successfully');
      expect(mockNotificationsService.processAction).toHaveBeenCalledWith(
        'user-uuid',
        1,
        ['550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002'],
      );
    });

    it('should return 400 when type is missing', async () => {
      await request(app.getHttpServer())
        .patch('/notifications')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send({ ids: ['notif-1'] })
        .expect(400);
    });

    it('should return 400 for invalid type value', async () => {
      await request(app.getHttpServer())
        .patch('/notifications')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send({ type: 99, ids: ['550e8400-e29b-41d4-a716-446655440000'] })
        .expect(400);
    });

    it('should return 400 for invalid ids format', async () => {
      await request(app.getHttpServer())
        .patch('/notifications')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send({ type: 1, ids: ['invalid-id'] })
        .expect(400);
    });
  });

  describe('PATCH /notifications - Delete Action', () => {
    it('should delete specific notifications', async () => {
      const response = await request(app.getHttpServer())
        .patch('/notifications')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send({ type: 2, ids: ['550e8400-e29b-41d4-a716-446655440000'] })
        .expect(200);

      expect(mockNotificationsService.processAction).toHaveBeenCalledWith(
        'user-uuid',
        2,
        ['550e8400-e29b-41d4-a716-446655440000'],
      );
    });
  });

  describe('PATCH /notifications - Delete All Action', () => {
    it('should delete all notifications for user', async () => {
      const response = await request(app.getHttpServer())
        .patch('/notifications')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send({ type: 3 })
        .expect(200);

      expect(mockNotificationsService.processAction).toHaveBeenCalledWith(
        'user-uuid',
        3,
        undefined,
      );
    });
  });

  describe('PATCH /notifications - Read All Action', () => {
    it('should mark all notifications as read', async () => {
      const response = await request(app.getHttpServer())
        .patch('/notifications')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send({ type: 4 })
        .expect(200);

      expect(mockNotificationsService.processAction).toHaveBeenCalledWith(
        'user-uuid',
        4,
        undefined,
      );
    });
  });
});
