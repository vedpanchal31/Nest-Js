import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationStatus, NotificationType } from './entities/notification.entity';
import { CreateNotificationDto } from './dtos/create-notification.dto';
import { UpdateNotificationDto } from './dtos/update-notification.dto';
import { NotificationQueryDto } from './dtos/notification-query.dto';

@Injectable()
export class NotificationsService {
    constructor(
        @InjectRepository(Notification)
        private readonly notificationRepository: Repository<Notification>,
    ) { }

    async create(createDto: CreateNotificationDto): Promise<Notification> {
        const notification = this.notificationRepository.create(createDto);
        return await this.notificationRepository.save(notification);
    }

    async createPaymentSuccessNotification(userId: string, orderId: string, amount: number): Promise<Notification> {
        return await this.create({
            userId,
            type: NotificationType.PAYMENT,
            title: 'Payment Successful',
            message: `Payment of $${amount.toFixed(2)} for order #${orderId.substring(0, 8).toUpperCase()} received successfully.`,
            actionUrl: `/orders/${orderId}`,
        });
    }

    async createPaymentFailedNotification(userId: string, orderId: string, amount: number): Promise<Notification> {
        return await this.create({
            userId,
            type: NotificationType.PAYMENT,
            title: 'Payment Failed',
            message: `Payment of $${amount.toFixed(2)} for order #${orderId.substring(0, 8).toUpperCase()} failed. Please retry or use a different payment method.`,
            actionUrl: `/orders/${orderId}/payment`,
        });
    }

    async createPromotionNotification(userId: string, title: string, message: string, actionUrl?: string): Promise<Notification> {
        return await this.create({
            userId,
            type: NotificationType.PROMOTION,
            title,
            message,
            actionUrl: actionUrl || '/promotions',
        });
    }

    async findAll(query: NotificationQueryDto): Promise<{ data: Notification[]; total: number; page: number; limit: number; totalPages: number }> {
        const where: any = {};

        if (query.userId) where.userId = query.userId;
        if (query.type) where.type = query.type;
        if (query.isRead !== undefined) where.isRead = query.isRead;
        if (query.fromDate && query.toDate) {
            where.createdAt = {
                $gte: new Date(query.fromDate),
                $lte: new Date(query.toDate),
            };
        }

        const [data, total] = await this.notificationRepository.findAndCount({
            where,
            order: { [query.orderBy || 'createdAt']: query.sortDir || 'desc' },
            skip: ((query.page || 1) - 1) * (query.limit || 10),
            take: query.limit || 10,
            relations: ['user'],
        });

        const limit = query.limit || 10;
        const page = query.page || 1;

        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async findOne(id: string): Promise<Notification> {
        const notification = await this.notificationRepository.findOne({
            where: { id },
            relations: ['user'],
        });

        if (!notification) {
            throw new NotFoundException(`Notification with ID "${id}" not found`);
        }

        return notification;
    }

    async findByUser(userId: string): Promise<Notification[]> {
        return await this.notificationRepository.find({
            where: { userId },
            order: { createdAt: 'DESC' },
        });
    }

    async getUnreadCount(userId: string): Promise<number> {
        return await this.notificationRepository.count({
            where: { userId, isRead: false },
        });
    }

    async markAsRead(id: string): Promise<Notification> {
        const notification = await this.findOne(id);
        notification.isRead = true;
        notification.status = NotificationStatus.READ;
        notification.readAt = new Date();
        return await this.notificationRepository.save(notification);
    }

    async markAllAsRead(userId: string): Promise<void> {
        await this.notificationRepository.update(
            { userId, isRead: false },
            { isRead: true, status: NotificationStatus.READ, readAt: new Date() },
        );
    }

    async update(id: string, updateDto: UpdateNotificationDto): Promise<Notification> {
        const notification = await this.findOne(id);
        Object.assign(notification, updateDto);
        return await this.notificationRepository.save(notification);
    }

    async remove(id: string): Promise<void> {
        const result = await this.notificationRepository.delete(id);
        if (result.affected === 0) {
            throw new NotFoundException(`Notification with ID "${id}" not found`);
        }
    }

    async processAction(userId: string, type: number, ids?: string[]): Promise<{ message: string }> {
        // NotificationPayloadType: Read=1, Delete=2, Delete_all=3, Read_all=4
        switch (type) {
            case 1: // Read
                if (ids && ids.length > 0) {
                    for (const id of ids) {
                        await this.markAsRead(id);
                    }
                    return { message: `${ids.length} notification(s) marked as read` };
                }
                return { message: 'No notifications to mark as read' };
            case 2: // Delete
                if (ids && ids.length > 0) {
                    for (const id of ids) {
                        await this.remove(id);
                    }
                    return { message: `${ids.length} notification(s) deleted` };
                }
                return { message: 'No notifications to delete' };
            case 3: // Delete_all
                await this.removeAllByUser(userId);
                return { message: 'All notifications deleted' };
            case 4: // Read_all
                await this.markAllAsRead(userId);
                return { message: 'All notifications marked as read' };
            default:
                throw new Error('Invalid action type');
        }
    }

    async removeAllByUser(userId: string): Promise<void> {
        await this.notificationRepository.delete({ userId });
    }
}