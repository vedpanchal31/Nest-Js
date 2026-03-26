import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CloudinaryModule } from 'src/core/cloudinary/cloudinary.module';
import { AuthModule } from '../auth/auth.module';
import { RolesModule } from '../roles/roles.module';
import { Media } from './entities/media.entity';
import { MediaService } from './media.service';
import { MediaController } from './media.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Media]), CloudinaryModule, AuthModule, RolesModule],
  controllers: [MediaController],
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule { }
