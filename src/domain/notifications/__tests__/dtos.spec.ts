import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateNotificationDto } from '../dtos/create-notification.dto';
import { UpdateNotificationDto } from '../dtos/update-notification.dto';
import {
  NotificationQueryDto,
  NotificationActionDto,
  NotificationPayloadType,
} from '../dtos/notification-query.dto';
import { NotificationType } from '../entities/notification.entity';

describe('Notification DTOs - Validation', () => {
  describe('CreateNotificationDto', () => {
    it('should validate valid CreateNotificationDto', async () => {
      const dto = plainToInstance(CreateNotificationDto, {
        userId: '550e8400-e29b-41d4-a716-446655440001',
        type: NotificationType.ORDER,
        title: 'Order Confirmed',
        message: 'Your order has been confirmed',
        actionUrl: '/orders/123',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation when userId is missing', async () => {
      const dto = plainToInstance(CreateNotificationDto, {
        type: NotificationType.ORDER,
        title: 'Order Confirmed',
        message: 'Your order has been confirmed',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('userId');
    });

    it('should fail validation when userId is not a UUID', async () => {
      const dto = plainToInstance(CreateNotificationDto, {
        userId: 'invalid-uuid',
        type: NotificationType.ORDER,
        title: 'Order Confirmed',
        message: 'Your order has been confirmed',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('userId');
    });

    it('should fail validation when type is missing', async () => {
      const dto = plainToInstance(CreateNotificationDto, {
        userId: '550e8400-e29b-41d4-a716-446655440001',
        title: 'Order Confirmed',
        message: 'Your order has been confirmed',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'type')).toBe(true);
    });

    it('should fail validation when type is invalid', async () => {
      const dto = plainToInstance(CreateNotificationDto, {
        userId: '550e8400-e29b-41d4-a716-446655440001',
        type: 'invalid-type',
        title: 'Order Confirmed',
        message: 'Your order has been confirmed',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail validation when title is missing', async () => {
      const dto = plainToInstance(CreateNotificationDto, {
        userId: '550e8400-e29b-41d4-a716-446655440001',
        type: NotificationType.ORDER,
        message: 'Your order has been confirmed',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'title')).toBe(true);
    });

    it('should fail validation when title is not a string', async () => {
      const dto = plainToInstance(CreateNotificationDto, {
        userId: '550e8400-e29b-41d4-a716-446655440001',
        type: NotificationType.ORDER,
        title: 123,
        message: 'Your order has been confirmed',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail validation when message is missing', async () => {
      const dto = plainToInstance(CreateNotificationDto, {
        userId: '550e8400-e29b-41d4-a716-446655440001',
        type: NotificationType.ORDER,
        title: 'Order Confirmed',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'message')).toBe(true);
    });

    it('should pass validation when actionUrl is missing (optional)', async () => {
      const dto = plainToInstance(CreateNotificationDto, {
        userId: '550e8400-e29b-41d4-a716-446655440001',
        type: NotificationType.ORDER,
        title: 'Order Confirmed',
        message: 'Your order has been confirmed',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('UpdateNotificationDto', () => {
    it('should validate with all fields optional', async () => {
      const dto = plainToInstance(UpdateNotificationDto, {});

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate partial update with title only', async () => {
      const dto = plainToInstance(UpdateNotificationDto, {
        title: 'Updated Title',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate partial update with valid fields', async () => {
      const dto = plainToInstance(UpdateNotificationDto, {
        title: 'Updated Title',
        message: 'Updated message',
        actionUrl: '/new-url',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('NotificationQueryDto', () => {
    it('should validate with default values', async () => {
      const dto = plainToInstance(NotificationQueryDto, {});

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
      expect(dto.page).toBe(1);
      expect(dto.limit).toBe(10);
    });

    it('should transform page string to number', async () => {
      const dto = plainToInstance(NotificationQueryDto, { page: '2' });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
      expect(dto.page).toBe(2);
    });

    it('should fail when page is less than 1', async () => {
      const dto = plainToInstance(NotificationQueryDto, { page: 0 });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should transform limit string to number', async () => {
      const dto = plainToInstance(NotificationQueryDto, { limit: '20' });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
      expect(dto.limit).toBe(20);
    });

    it('should fail when limit is less than 1', async () => {
      const dto = plainToInstance(NotificationQueryDto, { limit: 0 });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should validate search string', async () => {
      const dto = plainToInstance(NotificationQueryDto, {
        search: 'test query',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate valid type enum', async () => {
      const dto = plainToInstance(NotificationQueryDto, {
        type: NotificationType.PAYMENT,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail with invalid type', async () => {
      const dto = plainToInstance(NotificationQueryDto, { type: 'invalid' });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should validate userId UUID', async () => {
      const dto = plainToInstance(NotificationQueryDto, {
        userId: '550e8400-e29b-41d4-a716-446655440001',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail with invalid userId', async () => {
      const dto = plainToInstance(NotificationQueryDto, {
        userId: 'not-a-uuid',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should transform isRead string "true" to boolean', async () => {
      const dto = plainToInstance(NotificationQueryDto, { isRead: 'true' });

      expect(dto.isRead).toBe(true);
    });

    it('should transform isRead string "false" to boolean', async () => {
      const dto = plainToInstance(NotificationQueryDto, { isRead: 'false' });

      expect(dto.isRead).toBe(false);
    });

    it('should keep isRead as is when not "true" or "false"', async () => {
      const dto = plainToInstance(NotificationQueryDto, { isRead: 'maybe' });

      expect(dto.isRead).toBe('maybe');
    });

    it('should validate sort direction', async () => {
      const dto = plainToInstance(NotificationQueryDto, { sortDir: 'asc' });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate date strings', async () => {
      const dto = plainToInstance(NotificationQueryDto, {
        fromDate: '2024-01-01',
        toDate: '2024-12-31',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail with invalid date format', async () => {
      const dto = plainToInstance(NotificationQueryDto, {
        fromDate: 'invalid-date',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('NotificationActionDto', () => {
    it('should validate valid action dto', async () => {
      const dto = plainToInstance(NotificationActionDto, {
        type: NotificationPayloadType.Read,
        ids: ['550e8400-e29b-41d4-a716-446655440001'],
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate without optional ids', async () => {
      const dto = plainToInstance(NotificationActionDto, {
        type: NotificationPayloadType.Read_all,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail with invalid type', async () => {
      const dto = plainToInstance(NotificationActionDto, {
        type: 99,
        ids: ['550e8400-e29b-41d4-a716-446655440001'],
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail when type is missing', async () => {
      const dto = plainToInstance(NotificationActionDto, {
        ids: ['550e8400-e29b-41d4-a716-446655440001'],
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail with invalid UUID in ids array', async () => {
      const dto = plainToInstance(NotificationActionDto, {
        type: NotificationPayloadType.Delete,
        ids: ['invalid-uuid'],
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should validate all action types', async () => {
      const types = [
        NotificationPayloadType.Read,
        NotificationPayloadType.Delete,
        NotificationPayloadType.Delete_all,
        NotificationPayloadType.Read_all,
      ];

      for (const type of types) {
        const dto = plainToInstance(NotificationActionDto, { type });
        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      }
    });
  });
});
