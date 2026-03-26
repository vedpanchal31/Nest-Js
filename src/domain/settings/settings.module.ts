import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { CloudinaryModule } from '../../core/cloudinary/cloudinary.module';
import { AuthModule } from '../auth/auth.module';
import { RolesModule } from '../roles/roles.module';
import { Settings } from './entities/settings.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Settings]), CloudinaryModule, AuthModule, RolesModule],
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule { }
