import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersController } from './orders.controller';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { CartModule } from '../cart/cart.module';
import { OrderService } from './orders.service';
import { AuthModule } from '../auth/auth.module';
import { OrderManagementController } from './order-management.controller';
import { RolesModule } from '../roles/roles.module';
import { DeliveryPartnersModule } from '../delivery-partners/delivery-partners.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem]),
    CartModule,
    AuthModule,
    RolesModule,
    DeliveryPartnersModule,
  ],
  controllers: [OrdersController, OrderManagementController],
  providers: [OrderService],
})
export class OrdersModule {}
