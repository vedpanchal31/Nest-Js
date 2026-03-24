import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { DeliveryPartnerService } from './delivery-partners.service';
import { AuthGuard } from '../../core/guards/auth.guard';
import { RoleGuard } from '../../core/guards/role.guard';
import { RoutePermission } from '../../core/decorators/route-permission.decorator';
import { PermissionType } from '../../core/constants/interfaces/common/permissions';

@ApiTags('Delivery Partner Management')
@ApiBearerAuth()
@UseGuards(AuthGuard, RoleGuard)
@Controller('delivery-partner-management')
export class DeliveryPartnerManagementController {
  constructor(private readonly partnerService: DeliveryPartnerService) {}

  @Get()
  @RoutePermission(PermissionType.VIEW_DELIVERY_PARTNERS)
  @ApiOperation({ summary: 'List all delivery partners (Admin)' })
  @ApiQuery({ name: 'page', required: true, example: 1 })
  @ApiQuery({ name: 'limit', required: true, example: 10 })
  async listAllPartners(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return await this.partnerService.listAllPartners(page, limit);
  }

  @Patch(':id/verify')
  @RoutePermission(PermissionType.MANAGE_DELIVERY_PARTNERS)
  @ApiOperation({
    summary: 'Verify/Enable or Disable delivery partner (Admin)',
  })
  @ApiBody({
    schema: { type: 'object', properties: { isVerified: { type: 'boolean' } } },
  })
  async toggleVerification(
    @Param('id') id: string,
    @Body('isVerified') isVerified: boolean,
  ) {
    return await this.partnerService.toggleVerification(id, isVerified);
  }

  @Delete(':id')
  @RoutePermission(PermissionType.MANAGE_DELIVERY_PARTNERS)
  @ApiOperation({ summary: 'Delete delivery partner (Admin)' })
  async deletePartner(@Param('id') id: string) {
    return await this.partnerService.deletePartner(id);
  }
}
