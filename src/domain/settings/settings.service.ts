import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CloudinaryService,
  MulterFile,
} from '../../core/cloudinary/cloudinary.service';
import { UploadApiResponse } from 'cloudinary';
import { Settings } from './entities/settings.entity';

@Injectable()
export class SettingsService {
  constructor(
    private readonly cloudinaryService: CloudinaryService,
    @InjectRepository(Settings)
    private readonly settingsRepository: Repository<Settings>,
  ) {}

  private async getOrCreateSettings(): Promise<Settings> {
    let settings = await this.settingsRepository.findOne({ where: {} });
    if (!settings) {
      settings = this.settingsRepository.create({});
      await this.settingsRepository.save(settings);
    }
    return settings;
  }

  async getCompanyLogo() {
    const settings = await this.getOrCreateSettings();
    return {
      logoUrl: settings.logoUrl,
      updatedAt: settings.updatedAt,
    };
  }

  async uploadCompanyLogo(file: MulterFile) {
    if (!file) {
      throw new NotFoundException('No file uploaded');
    }

    try {
      const uploadResult = await this.cloudinaryService.uploadImage(
        file,
        'company-logo',
      );

      let logoUrl = '';
      if ('secure_url' in uploadResult) {
        logoUrl = (uploadResult as UploadApiResponse).secure_url;
      }

      // Update settings with new logo URL
      const settings = await this.getOrCreateSettings();
      settings.logoUrl = logoUrl;
      await this.settingsRepository.save(settings);

      return {
        message: 'Company logo uploaded successfully',
        logoUrl,
        publicId: uploadResult.public_id || 'company-logo/main-logo',
        updatedAt: new Date(),
      };
    } catch (error) {
      throw new Error(`Failed to upload logo: ${error.message}`);
    }
  }

  async updateCompanyLogo(file: MulterFile) {
    return this.uploadCompanyLogo(file); // Same logic as upload since we overwrite
  }

  async getCompanyInfo() {
    const settings = await this.getOrCreateSettings();
    return {
      name: settings.name,
      tagline: settings.tagline,
      address: settings.address,
      email: settings.email,
      phone: settings.phone,
      website: settings.website,
      logoUrl: settings.logoUrl,
      updatedAt: settings.updatedAt,
    };
  }

  async updateCompanyInfo(updateData: any) {
    const settings = await this.getOrCreateSettings();

    // Update only provided fields
    if (updateData.name !== undefined) settings.name = updateData.name;
    if (updateData.tagline !== undefined) settings.tagline = updateData.tagline;
    if (updateData.address !== undefined) settings.address = updateData.address;
    if (updateData.email !== undefined) settings.email = updateData.email;
    if (updateData.phone !== undefined) settings.phone = updateData.phone;
    if (updateData.website !== undefined) settings.website = updateData.website;

    await this.settingsRepository.save(settings);

    return {
      message: 'Company information updated successfully',
      data: {
        name: settings.name,
        tagline: settings.tagline,
        address: settings.address,
        email: settings.email,
        phone: settings.phone,
        website: settings.website,
        logoUrl: settings.logoUrl,
        updatedAt: settings.updatedAt,
      },
    };
  }
}
