import {
  Controller,
  Post,
  Patch,
  Body,
  UseGuards,
  Req,
  Get,
  Param,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { DeliveryPartnerService } from './delivery-partners.service';
import { RegisterDeliveryPartnerDto } from './dtos/register-delivery-partner.dto';
import { AuthGuard } from '../../core/guards/auth.guard';
import { ITokenPayload } from '../../core/constants/interfaces/common';
import { UpdateLocationDto } from './dtos/update-location.dto';
import { UpdateStatusDto } from './dtos/update-status.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { MulterFile } from '../../core/cloudinary/cloudinary.service';

@ApiTags('Delivery Partners')
@Controller('delivery-partners')
export class DeliveryPartnerController {
  constructor(private readonly partnerService: DeliveryPartnerService) {}

  @Post('register')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Register as a delivery partner' })
  @UseInterceptors(FileInterceptor('rcBookPhoto'))
  async register(
    @Body() dto: RegisterDeliveryPartnerDto,
    @UploadedFile() file: MulterFile,
  ) {
    return await this.partnerService.register(dto, file);
  }

  @Patch('location')
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Update live location' })
  async updateLocation(
    @Req() req: { user: ITokenPayload },
    @Body() dto: UpdateLocationDto,
  ) {
    return await this.partnerService.updateLocation(
      req.user.id,
      dto.lat,
      dto.lng,
    );
  }

  @Patch('status')
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Update online status' })
  async toggleStatus(
    @Req() req: { user: ITokenPayload },
    @Body() dto: UpdateStatusDto,
  ) {
    return await this.partnerService.toggleOnlineStatus(
      req.user.id,
      dto.isOnline,
    );
  }

  @Get('dashboard')
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: 'Delivery partner dashboard (Invitations & active tasks)',
  })
  async getDashboard(@Req() req: { user: ITokenPayload }) {
    return await this.partnerService.getMyDashboard(req.user.id);
  }

  @Patch('requests/:id/accept')
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Accept a delivery request' })
  async acceptRequest(
    @Req() req: { user: ITokenPayload },
    @Param('id') id: string,
  ) {
    return await this.partnerService.acceptRequest(id, req.user.id);
  }

  @Patch('requests/:id/reject')
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Reject a delivery request' })
  async rejectRequest(
    @Req() req: { user: ITokenPayload },
    @Param('id') id: string,
  ) {
    return await this.partnerService.rejectRequest(id, req.user.id);
  }
}
