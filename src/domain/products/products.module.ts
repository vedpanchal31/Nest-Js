import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { Product } from './entities/product.entity';
import { ProductImage } from './entities/product-image.entity';
import { CloudinaryModule } from 'src/core/cloudinary/cloudinary.module';
import { AuthModule } from '../auth/auth.module';
import { CategoriesModule } from '../categories/categories.module';
import { UsersModule } from '../users/users.module';
import { RolesModule } from '../roles/roles.module';
import { BulkUploadModule } from 'src/core/bulk-upload/bulk-upload.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, ProductImage]),
    CloudinaryModule,
    AuthModule,
    CategoriesModule,
    UsersModule,
    RolesModule,
    BulkUploadModule,
  ],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
