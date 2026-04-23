import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CloudinaryModule } from 'src/core/cloudinary/cloudinary.module';
import { AuthModule } from '../auth/auth.module';
import { RolesModule } from '../roles/roles.module';
import { Media } from './entities/media.entity';
import { MediaService } from './media.service';
import { MediaController } from './media.controller';
import { ImageUpdateService } from './image-update.service';
import { ImageUpdateController } from './image-update.controller';
import { Product } from '../products/entities/product.entity';
import { ProductImage } from '../products/entities/product-image.entity';
import { Category } from '../categories/entities/category.entity';
import { CategoryImage } from '../categories/entities/category-image.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Media,
      Product,
      ProductImage,
      Category,
      CategoryImage,
    ]),
    CloudinaryModule,
    AuthModule,
    RolesModule,
  ],
  controllers: [MediaController, ImageUpdateController],
  providers: [MediaService, ImageUpdateService],
  exports: [MediaService, ImageUpdateService],
})
export class MediaModule {}
