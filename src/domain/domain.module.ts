import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { RolesModule } from './roles/roles.module';
import { ProductsModule } from './products/products.module';
import { CategoriesModule } from './categories/categories.module';

@Module({
  imports: [AuthModule, RolesModule, ProductsModule, CategoriesModule],
})
export class DomainModule {}
