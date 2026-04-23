import { Test } from '@nestjs/testing';
import { NotificationsProcessor } from '../notifications.processor';
import { NotificationsService } from '../notifications.service';
import { NotificationType } from '../entities/notification.entity';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';

describe('NotificationsProcessor - Comprehensive', () => {
  let processor: NotificationsProcessor;
  let notificationsService: jest.Mocked<NotificationsService>;

  const mockNotification = {
    id: 'notification-uuid',
    userId: 'user-uuid',
    type: NotificationType.ORDER,
    title: 'Test Notification',
    message: 'Test message',
    actionUrl: '/test',
    isRead: false,
    createdAt: new Date(),
  };

  const mockNotificationsService = {
    create: jest.fn().mockResolvedValue(mockNotification),
  };

  // Spy on logger
  let loggerLogSpy: jest.SpyInstance;
  let loggerErrorSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        NotificationsProcessor,
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
      ],
    }).compile();

    processor = module.get<NotificationsProcessor>(NotificationsProcessor);
    notificationsService = module.get(NotificationsService);

    // Setup logger spies
    loggerLogSpy = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => {});
    loggerErrorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => {});

    jest.clearAllMocks();
  });

  afterEach(() => {
    loggerLogSpy.mockRestore();
    loggerErrorSpy.mockRestore();
  });

  describe('handleSendNotification - Process Send Job', () => {
    it('should create notification from job data', async () => {
      const jobData = {
        userId: 'user-uuid',
        type: NotificationType.ORDER,
        title: 'Order Placed',
        message: 'Your order has been placed',
        actionUrl: '/orders/123',
        eventName: 'order.created',
      };
      const job = { data: jobData } as Job<any>;

      const result = await processor.handleSendNotification(job);

      expect(notificationsService.create).toHaveBeenCalledWith({
        userId: jobData.userId,
        type: jobData.type,
        title: jobData.title,
        message: jobData.message,
        actionUrl: jobData.actionUrl,
      });
      expect(result).toEqual(mockNotification);
    });

    it('should log success message', async () => {
      const jobData = {
        userId: 'user-uuid',
        type: NotificationType.PAYMENT,
        title: 'Payment Success',
        message: 'Payment received',
        actionUrl: '/orders/123',
        eventName: 'payment.success',
      };
      const job = { data: jobData } as Job<any>;

      await processor.handleSendNotification(job);

      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'Notification sent for event "payment.success"',
        ),
      );
    });

    it('should throw and log error when creation fails', async () => {
      const jobData = {
        userId: 'user-uuid',
        type: NotificationType.SYSTEM,
        title: 'System Alert',
        message: 'System message',
        eventName: 'system.alert',
      };
      const job = { data: jobData } as Job<any>;
      const error = new Error('Database error');
      notificationsService.create.mockRejectedValueOnce(error);

      await expect(processor.handleSendNotification(job)).rejects.toThrow(
        'Database error',
      );

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to send notification'),
        expect.any(String),
      );
    });
  });

  describe('handleWelcomeNotification - Welcome Email Job', () => {
    it('should create welcome notification', async () => {
      const jobData = {
        userId: 'new-user-uuid',
        userName: 'John Doe',
      };
      const job = { data: jobData } as Job<any>;

      const result = await processor.handleWelcomeNotification(job);

      expect(notificationsService.create).toHaveBeenCalledWith({
        userId: jobData.userId,
        type: NotificationType.SYSTEM,
        title: 'Welcome to Velora!',
        message: `Hello ${jobData.userName}, welcome to Velora! Start exploring our products and enjoy shopping.`,
        actionUrl: '/products',
      });
      expect(result).toEqual(mockNotification);
    });

    it('should log welcome notification success', async () => {
      const jobData = {
        userId: 'new-user-uuid',
        userName: 'Jane Smith',
      };
      const job = { data: jobData } as Job<any>;

      await processor.handleWelcomeNotification(job);

      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'Welcome notification sent to user new-user-uuid',
        ),
      );
    });

    it('should throw and log error when welcome notification fails', async () => {
      const jobData = {
        userId: 'new-user-uuid',
        userName: 'John Doe',
      };
      const job = { data: jobData } as Job<any>;
      const error = new Error('Service unavailable');
      notificationsService.create.mockRejectedValueOnce(error);

      await expect(processor.handleWelcomeNotification(job)).rejects.toThrow(
        'Service unavailable',
      );

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to send welcome notification'),
        expect.any(String),
      );
    });
  });
});
