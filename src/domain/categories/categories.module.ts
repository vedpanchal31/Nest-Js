import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from './entities/category.entity';
import { CategoryImage } from './entities/category-image.entity';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { AuthModule } from '../auth/auth.module';
import { RolesModule } from '../roles/roles.module';
import { CloudinaryModule } from 'src/core/cloudinary/cloudinary.module';
import { BulkUploadModule } from 'src/core/bulk-upload/bulk-upload.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Category, CategoryImage]),
    AuthModule,
    RolesModule,
    CloudinaryModule,
    BulkUploadModule,
  ],
  controllers: [CategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule { }
