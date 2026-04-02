import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from '../notifications.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Notification, NotificationStatus, NotificationType } from '../entities/notification.entity';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';

describe('NotificationsService - Comprehensive', () => {
  let service: NotificationsService;
  let notificationRepository: jest.Mocked<Repository<Notification>>;

  const mockNotification = {
    id: 'notification-uuid',
    userId: 'user-uuid',
    type: NotificationType.ORDER,
    title: 'Order Confirmed',
    message: 'Your order #123 has been confirmed',
    actionUrl: '/orders/123',
    status: NotificationStatus.UNREAD,
    isRead: false,
    readAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as Notification;

  const mockPaymentNotification = {
    id: 'payment-notification-uuid',
    userId: 'user-uuid',
    type: NotificationType.PAYMENT,
    title: 'Payment Successful',
    message: 'Payment of $99.99 received',
    actionUrl: '/orders/order-uuid',
    status: NotificationStatus.UNREAD,
    isRead: false,
    createdAt: new Date(),
  } as Notification;

  const mockNotificationRepository = {
    create: jest.fn().mockReturnValue(mockNotification),
    save: jest.fn().mockResolvedValue(mockNotification),
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    count: jest.fn(),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: getRepositoryToken(Notification),
          useValue: mockNotificationRepository,
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    notificationRepository = module.get(getRepositoryToken(Notification));
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create - Basic Creation', () => {
    it('should create and save notification', async () => {
      const createDto = {
        userId: 'user-uuid',
        type: NotificationType.ORDER,
        title: 'Order Confirmed',
        message: 'Your order has been confirmed',
        actionUrl: '/orders/123',
      };

      const result = await service.create(createDto);

      expect(notificationRepository.create).toHaveBeenCalledWith(createDto);
      expect(notificationRepository.save).toHaveBeenCalled();
      expect(result).toEqual(mockNotification);
    });
  });

  describe('createPaymentSuccessNotification - Payment Success', () => {
    it('should create payment success notification with formatted message', async () => {
      const userId = 'user-uuid';
      const orderId = '550e8400-e29b-41d4-a716-446655440000';
      const amount = 99.99;

      const result = await service.createPaymentSuccessNotification(userId, orderId, amount);

      expect(notificationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          type: NotificationType.PAYMENT,
          title: 'Payment Successful',
          actionUrl: `/orders/${orderId}`,
        }),
      );
      expect(notificationRepository.save).toHaveBeenCalled();
    });

    it('should format order ID in uppercase (first 8 chars)', async () => {
      const orderId = '550e8400-e29b-41d4-a716-446655440000';

      await service.createPaymentSuccessNotification('user-uuid', orderId, 100);

      const createCall = notificationRepository.create.mock.calls[0][0];
      expect(createCall.message).toContain('550E8400');
    });

    it('should format amount with 2 decimal places', async () => {
      await service.createPaymentSuccessNotification('user-uuid', 'order-uuid', 99.9);

      const createCall = notificationRepository.create.mock.calls[0][0];
      expect(createCall.message).toContain('$99.90');
    });
  });

  describe('createPaymentFailedNotification - Payment Failed', () => {
    it('should create payment failed notification', async () => {
      const userId = 'user-uuid';
      const orderId = 'order-uuid';
      const amount = 99.99;

      await service.createPaymentFailedNotification(userId, orderId, amount);

      expect(notificationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          type: NotificationType.PAYMENT,
          title: 'Payment Failed',
          actionUrl: `/orders/${orderId}/payment`,
        }),
      );
    });
  });

  describe('createPromotionNotification - Promotions', () => {
    it('should create promotion notification with provided data', async () => {
      const userId = 'user-uuid';
      const title = 'Special Offer!';
      const message = 'Get 50% off on all products';
      const actionUrl = '/sale';

      await service.createPromotionNotification(userId, title, message, actionUrl);

      expect(notificationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          type: NotificationType.PROMOTION,
          title,
          message,
          actionUrl,
        }),
      );
    });

    it('should use default actionUrl when not provided', async () => {
      await service.createPromotionNotification('user-uuid', 'Title', 'Message');

      const createCall = notificationRepository.create.mock.calls[0][0];
      expect(createCall.actionUrl).toBe('/promotions');
    });
  });

  describe('findAll - Query and Pagination', () => {
    it('should return paginated notifications', async () => {
      notificationRepository.findAndCount.mockResolvedValue([[mockNotification], 1]);
      const query = { page: 1, limit: 10 };

      const result = await service.findAll(query);

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page');
      expect(result).toHaveProperty('limit');
      expect(result).toHaveProperty('totalPages');
    });

    it('should filter by userId', async () => {
      notificationRepository.findAndCount.mockResolvedValue([[mockNotification], 1]);
      const query = { userId: 'specific-user', page: 1, limit: 10 };

      await service.findAll(query);

      expect(notificationRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'specific-user' }),
        }),
      );
    });

    it('should filter by type', async () => {
      notificationRepository.findAndCount.mockResolvedValue([[mockNotification], 1]);
      const query = { type: NotificationType.ORDER, page: 1, limit: 10 };

      await service.findAll(query);

      expect(notificationRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ type: NotificationType.ORDER }),
        }),
      );
    });

    it('should filter by isRead status', async () => {
      notificationRepository.findAndCount.mockResolvedValue([[mockNotification], 1]);
      const query = { isRead: false, page: 1, limit: 10 };

      await service.findAll(query);

      expect(notificationRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isRead: false }),
        }),
      );
    });

    it('should apply date range filter', async () => {
      notificationRepository.findAndCount.mockResolvedValue([[mockNotification], 1]);
      const query = { fromDate: '2024-01-01', toDate: '2024-12-31', page: 1, limit: 10 };

      await service.findAll(query);

      expect(notificationRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: {
              $gte: expect.any(Date),
              $lte: expect.any(Date),
            },
          }),
        }),
      );
    });

    it('should use default pagination when not provided', async () => {
      notificationRepository.findAndCount.mockResolvedValue([[mockNotification], 1]);
      const query = {};

      const result = await service.findAll(query);

      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should include user relation', async () => {
      notificationRepository.findAndCount.mockResolvedValue([[mockNotification], 1]);
      const query = { page: 1, limit: 10 };

      await service.findAll(query);

      expect(notificationRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          relations: ['user'],
        }),
      );
    });
  });

  describe('findOne - Single Notification', () => {
    it('should return notification by id', async () => {
      notificationRepository.findOne.mockResolvedValue(mockNotification);

      const result = await service.findOne('notification-uuid');

      expect(result).toEqual(mockNotification);
      expect(notificationRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'notification-uuid' },
        relations: ['user'],
      });
    });

    it('should throw NotFoundException when notification not found', async () => {
      notificationRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByUser - User Notifications', () => {
    it('should return all notifications for user sorted by createdAt DESC', async () => {
      notificationRepository.find.mockResolvedValue([mockNotification]);

      const result = await service.findByUser('user-uuid');

      expect(notificationRepository.find).toHaveBeenCalledWith({
        where: { userId: 'user-uuid' },
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual([mockNotification]);
    });
  });

  describe('getUnreadCount - Count Unread', () => {
    it('should return count of unread notifications for user', async () => {
      notificationRepository.count.mockResolvedValue(5);

      const result = await service.getUnreadCount('user-uuid');

      expect(notificationRepository.count).toHaveBeenCalledWith({
        where: { userId: 'user-uuid', isRead: false },
      });
      expect(result).toBe(5);
    });
  });

  describe('markAsRead - Mark Single Read', () => {
    it('should mark notification as read with timestamp', async () => {
      notificationRepository.findOne.mockResolvedValue(mockNotification);
      const saveSpy = jest.fn().mockResolvedValue({
        ...mockNotification,
        isRead: true,
        status: NotificationStatus.READ,
        readAt: new Date(),
      });
      notificationRepository.save = saveSpy;

      await service.markAsRead('notification-uuid');

      expect(saveSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          isRead: true,
          status: NotificationStatus.READ,
          readAt: expect.any(Date),
        }),
      );
    });

    it('should throw NotFoundException when notification not found', async () => {
      notificationRepository.findOne.mockResolvedValue(null);

      await expect(service.markAsRead('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('markAllAsRead - Mark All Read', () => {
    it('should update all unread notifications for user', async () => {
      await service.markAllAsRead('user-uuid');

      expect(notificationRepository.update).toHaveBeenCalledWith(
        { userId: 'user-uuid', isRead: false },
        { isRead: true, status: NotificationStatus.READ, readAt: expect.any(Date) },
      );
    });
  });

  describe('update - Update Notification', () => {
    it('should update notification fields', async () => {
      notificationRepository.findOne.mockResolvedValue(mockNotification);
      const saveSpy = jest.fn().mockResolvedValue({
        ...mockNotification,
        title: 'Updated Title',
      });
      notificationRepository.save = saveSpy;

      await service.update('notification-uuid', { title: 'Updated Title' } as any);

      expect(saveSpy).toHaveBeenCalledWith(expect.objectContaining({ title: 'Updated Title' }));
    });

    it('should throw NotFoundException when notification not found', async () => {
      notificationRepository.findOne.mockResolvedValue(null);

      await expect(service.update('non-existent', {} as any)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove - Delete Notification', () => {
    it('should delete notification by id', async () => {
      await service.remove('notification-uuid');

      expect(notificationRepository.delete).toHaveBeenCalledWith('notification-uuid');
    });

    it('should throw NotFoundException when notification not found', async () => {
      notificationRepository.delete.mockResolvedValue({ affected: 0, raw: [] } as any);

      await expect(service.remove('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('processAction - Batch Actions', () => {
    it('should mark notifications as read (type 1)', async () => {
      notificationRepository.findOne.mockResolvedValue(mockNotification);

      const result = await service.processAction('user-uuid', 1, ['notif-1', 'notif-2']);

      expect(result.message).toBe('2 notification(s) marked as read');
    });

    it('should delete notifications (type 2)', async () => {
      // Reset mock to return success
      notificationRepository.delete.mockResolvedValue({ affected: 1, raw: [] } as any);

      const result = await service.processAction('user-uuid', 2, ['notif-1', 'notif-2']);

      expect(result.message).toBe('2 notification(s) deleted');
      expect(notificationRepository.delete).toHaveBeenCalledTimes(2);
    });

    it('should delete all notifications (type 3)', async () => {
      const result = await service.processAction('user-uuid', 3);

      expect(result.message).toBe('All notifications deleted');
      expect(notificationRepository.delete).toHaveBeenCalledWith({ userId: 'user-uuid' });
    });

    it('should mark all as read (type 4)', async () => {
      const result = await service.processAction('user-uuid', 4);

      expect(result.message).toBe('All notifications marked as read');
      expect(notificationRepository.update).toHaveBeenCalledWith(
        { userId: 'user-uuid', isRead: false },
        { isRead: true, status: NotificationStatus.READ, readAt: expect.any(Date) },
      );
    });

    it('should return message when no ids for read action', async () => {
      const result = await service.processAction('user-uuid', 1, []);

      expect(result.message).toBe('No notifications to mark as read');
    });

    it('should return message when no ids for delete action', async () => {
      const result = await service.processAction('user-uuid', 2, []);

      expect(result.message).toBe('No notifications to delete');
    });

    it('should throw error for invalid action type', async () => {
      await expect(service.processAction('user-uuid', 99)).rejects.toThrow(
        'Invalid action type',
      );
    });
  });

  describe('removeAllByUser - Delete All For User', () => {
    it('should delete all notifications for user', async () => {
      await service.removeAllByUser('user-uuid');

      expect(notificationRepository.delete).toHaveBeenCalledWith({ userId: 'user-uuid' });
    });
  });
});
