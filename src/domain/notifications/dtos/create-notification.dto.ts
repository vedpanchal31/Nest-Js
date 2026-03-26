import { ApiProperty } from "@nestjs/swagger";
import { NotificationType } from "../entities/notification.entity";
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from "class-validator";

export class CreateNotificationDto {

    @ApiProperty({ description: 'User ID to send notification to' })
    @IsUUID()
    @IsNotEmpty()
    userId: string;

    @ApiProperty({
        description: 'Notification type',
        enum: NotificationType,
        example: 'order'
    })
    @IsEnum(NotificationType)
    @IsNotEmpty()
    type: NotificationType;

    @ApiProperty({ description: 'Notification title', example: 'Order Confirmed' })
    @IsString()
    @IsNotEmpty()
    title: string;

    @ApiProperty({ description: 'Notification message', example: 'Your order #123 has been confirmed' })
    @IsString()
    @IsNotEmpty()
    message: string;

    @ApiProperty({ description: 'Action URL (optional)', example: '/orders/123', required: false })
    @IsString()
    @IsOptional()
    actionUrl?: string;
}