import { IsEnum, IsOptional, IsUUID, IsString, IsBoolean, IsInt, Min, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { NotificationType } from '../entities/notification.entity';

export enum NotificationPayloadType {
    Read = 1,
    Delete = 2,
    Delete_all = 3,
    Read_all = 4,
}

export class NotificationActionDto {
    @ApiProperty({ description: 'Notification IDs to perform action on', type: [String], required: false, example: ['uuid-1', 'uuid-2'] })
    @IsUUID('4', { each: true })
    @IsOptional()
    ids?: string[];

    @ApiProperty({
        description: 'Action type: 1=Read, 2=Delete, 3=Delete all, 4=Read all',
        enum: NotificationPayloadType,
        required: true,
        example: 1,
        enumName: 'NotificationPayloadType'
    })
    @IsEnum(NotificationPayloadType)
    type: NotificationPayloadType;
}

export class NotificationQueryDto {
    @ApiProperty({ description: 'Page number', required: true, default: 1 })
    @Transform(({ value }) => parseInt(value, 10))
    @IsInt()
    @Min(1)
    @IsOptional()
    page?: number = 1;

    @ApiProperty({ description: 'Limit per page', required: true, default: 10 })
    @Transform(({ value }) => parseInt(value, 10))
    @IsInt()
    @Min(1)
    @IsOptional()
    limit?: number = 10;

    @ApiProperty({ description: 'Search term', required: false })
    @IsString()
    @IsOptional()
    search?: string;

    @ApiProperty({ description: 'Filter by notification type', enum: NotificationType, required: false })
    @IsEnum(NotificationType)
    @IsOptional()
    type?: NotificationType;

    @ApiProperty({ description: 'Filter by user ID (optional, will use token if not provided)', required: false })
    @IsUUID()
    @IsOptional()
    userId?: string;

    @ApiProperty({ description: 'Filter by read status', required: false })
    @Transform(({ value }) => {
        if (value === 'true') return true;
        if (value === 'false') return false;
        return value;
    })
    @IsBoolean()
    @IsOptional()
    isRead?: boolean;

    @ApiProperty({ description: 'Order by field', required: false, })
    @IsString()
    @IsOptional()
    orderBy?: string = '';

    @ApiProperty({ description: 'Sort direction', enum: ['asc', 'desc'], required: false })
    @IsString()
    @IsOptional()
    sortDir?: 'asc' | 'desc' = 'desc';

    @ApiProperty({ description: 'From date filter', required: false })
    @IsDateString()
    @IsOptional()
    fromDate?: string;

    @ApiProperty({ description: 'To date filter', required: false })
    @IsDateString()
    @IsOptional()
    toDate?: string;
}