import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from './entities/category.entity';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { AuthModule } from '../auth/auth.module';
import { RolesModule } from '../roles/roles.module';
import { CloudinaryModule } from 'src/core/cloudinary/cloudinary.module';

@Module({
  imports: [TypeOrmModule.forFeature([Category]), AuthModule, RolesModule, CloudinaryModule],
  controllers: [CategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule { }
