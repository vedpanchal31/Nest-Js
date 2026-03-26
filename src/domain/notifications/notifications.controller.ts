import {
    Controller,
    Get,
    Patch,
    Body,
    Query,
    Req,
    HttpCode,
    HttpStatus,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { NotificationQueryDto, NotificationActionDto } from './dtos/notification-query.dto';
import { Notification } from './entities/notification.entity';
import { ITokenPayload } from 'src/core/constants/interfaces/common';
import { AuthGuard } from 'src/core/guards/auth.guard';
import { UserType } from 'src/core/constants/app.constants';
import { Roles } from 'src/core/decorators/roles.decorator';

@ApiTags('Notifications')
@Controller('notifications')
@ApiBearerAuth()
@Roles(UserType.USER, UserType.ADMIN, UserType.SUPPLIER, UserType.DELIVERY_PARTNER)
@UseGuards(AuthGuard)
export class NotificationsController {
    constructor(private readonly notificationsService: NotificationsService) { }

    @Get()
    @ApiOperation({ summary: 'Get notifications with filters and pagination' })
    @ApiResponse({ status: 200, description: 'Notifications retrieved successfully' })
    async findAll(
        @Req() req: { user: ITokenPayload },
        @Query() query: NotificationQueryDto,
    ): Promise<{
        data: Notification[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }> {
        return await this.notificationsService.findAll({
            ...query,
            userId: req.user.id,
        });
    }

    @Patch()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Read or delete notification(s)' })
    @ApiResponse({ status: 200, description: 'Notification read or deleted successfully' })
    @ApiResponse({ status: 400, description: 'Invalid request parameters' })
    @ApiResponse({ status: 404, description: 'Notification not found' })
    async processAction(
        @Req() req: { user: ITokenPayload },
        @Body() actionDto: NotificationActionDto,
    ): Promise<{ message: string }> {
        return await this.notificationsService.processAction(
            req.user.id,
            actionDto.type,
            actionDto.ids,
        );
    }
}