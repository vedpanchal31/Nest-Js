import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeliveryPartner } from './entities/delivery-partner.entity';
import { DeliveryPartnerStatus } from './entities/delivery-partner-status.entity';
import { DeliveryPartnerService } from './delivery-partners.service';
import { DeliveryPartnerController } from './delivery-partners.controller';
import { AuthModule } from '../auth/auth.module';
import { DeliveryPartnerManagementController } from './delivery-partner-management.controller';
import { RolesModule } from '../roles/roles.module';
import { DeliveryRequest } from './entities/delivery-request.entity';
import { Order } from '../orders/entities/order.entity';
import { CloudinaryModule } from 'src/core/cloudinary/cloudinary.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DeliveryPartner,
      DeliveryPartnerStatus,
      DeliveryRequest,
      Order,
    ]),
    AuthModule,
    RolesModule,
    CloudinaryModule,
  ],
  controllers: [DeliveryPartnerController, DeliveryPartnerManagementController],
  providers: [DeliveryPartnerService],
  exports: [DeliveryPartnerService],
})
export class DeliveryPartnersModule {}
