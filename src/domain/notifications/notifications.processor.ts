import { Processor, Process } from '@nestjs/bull';
import type { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationType } from './entities/notification.entity';

interface NotificationJobData {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
  eventName: string;
}

@Processor('notifications')
export class NotificationsProcessor {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(private readonly notificationsService: NotificationsService) { }

  @Process('send-notification')
  async handleSendNotification(job: Job<NotificationJobData>) {
    const { userId, type, title, message, actionUrl, eventName } = job.data;

    try {
      const notification = await this.notificationsService.create({
        userId,
        type,
        title,
        message,
        actionUrl,
      });

      this.logger.log(
        `Notification sent for event "${eventName}" to user ${userId}: ${title}`,
      );

      return notification;
    } catch (error) {
      this.logger.error(
        `Failed to send notification for event "${eventName}": ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Process('welcome-notification')
  async handleWelcomeNotification(job: Job<{ userId: string; userName: string }>) {
    const { userId, userName } = job.data;

    try {
      const notification = await this.notificationsService.create({
        userId,
        type: NotificationType.SYSTEM,
        title: 'Welcome to Velora!',
        message: `Hello ${userName}, welcome to Velora! Start exploring our products and enjoy shopping.`,
        actionUrl: '/products',
      });

      this.logger.log(`Welcome notification sent to user ${userId}`);

      return notification;
    } catch (error) {
      this.logger.error(
        `Failed to send welcome notification: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
