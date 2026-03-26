import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { OrdersController } from './orders.controller';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { CartModule } from '../cart/cart.module';
import { OrderService } from './orders.service';
import { AuthModule } from '../auth/auth.module';
import { OrderManagementController } from './order-management.controller';
import { RolesModule } from '../roles/roles.module';
import { DeliveryPartnersModule } from '../delivery-partners/delivery-partners.module';
import { SettingsModule } from '../settings/settings.module';
import { InvoiceService } from '../../core/services/invoice.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem]),
    CartModule,
    AuthModule,
    RolesModule,
    DeliveryPartnersModule,
    SettingsModule,
    BullModule.registerQueue({
      name: 'notifications',
    }),
  ],
  controllers: [OrdersController, OrderManagementController],
  providers: [OrderService, InvoiceService],
})
export class OrdersModule {}
