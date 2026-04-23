import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { RolesModule } from './roles/roles.module';
import { ProductsModule } from './products/products.module';
import { CategoriesModule } from './categories/categories.module';
import { CartModule } from './cart/cart.module';
import { OrdersModule } from './orders/orders.module';
import { DeliveryPartnersModule } from './delivery-partners/delivery-partners.module';
import { SettingsModule } from './settings/settings.module';
import { NotificationsModule } from './notifications/notifications.module';
import { MediaModule } from './media/media.module';

@Module({
  imports: [
    AuthModule,
    RolesModule,
    ProductsModule,
    CategoriesModule,
    CartModule,
    OrdersModule,
    DeliveryPartnersModule,
    SettingsModule,
    NotificationsModule,
    MediaModule,
  ],
})
export class DomainModule {}
