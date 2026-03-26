import {
  Controller,
  Get,
  Post,
  Put,
  UseGuards,
  Req,
  UploadedFile,
  UseInterceptors,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiResponse,
  ApiBody,
  ApiProperty
} from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';
import { AuthGuard } from '../../core/guards/auth.guard';
import { RoleGuard } from '../../core/guards/role.guard';
import { Roles } from '../../core/decorators/roles.decorator';
import { UserType } from '../../core/constants/app.constants';
import { ITokenPayload } from '../../core/constants/interfaces/common';
import { SettingsService } from './settings.service';
import { MulterFile } from '../../core/cloudinary/cloudinary.service';

// Swagger DTOs
class UploadLogoDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Company logo image file (PNG, JPG, JPEG)',
    required: true
  })
  logo: any;
}

class CompanyInfoDto {
  @ApiProperty({
    description: 'Company name',
    example: 'Velora',
    required: false
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: 'Company tagline',
    example: 'Premium E-Commerce Solutions',
    required: false
  })
  @IsString()
  @IsOptional()
  tagline?: string;

  @ApiProperty({
    description: 'Company address',
    example: '123 Business Avenue, New York, NY 10001',
    required: false
  })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({
    description: 'Company email',
    example: 'contact@velora.com',
    required: false
  })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiProperty({
    description: 'Company phone',
    example: '+1 (555) 123-4567',
    required: false
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({
    description: 'Company website',
    example: 'https://velora.com',
    required: false
  })
  @IsString()
  @IsOptional()
  website?: string;
}

class CompanyLogoResponse {
  @ApiProperty({
    description: 'Company logo URL',
    example: 'https://res.cloudinary.com/your-cloud-name/image/upload/v1/company-logo/main-logo.png'
  })
  logoUrl: string;

  @ApiProperty({
    description: 'Last updated timestamp',
    example: '2026-03-25T11:23:00.000Z'
  })
  updatedAt: Date;
}

class UploadLogoResponse {
  @ApiProperty({
    description: 'Success message',
    example: 'Company logo uploaded successfully'
  })
  message: string;

  @ApiProperty({
    description: 'Company logo URL',
    example: 'https://res.cloudinary.com/your-cloud-name/image/upload/v1/company-logo/main-logo.png'
  })
  logoUrl: string;

  @ApiProperty({
    description: 'Cloudinary public ID',
    example: 'company-logo/main-logo'
  })
  publicId: string;

  @ApiProperty({
    description: 'Last updated timestamp',
    example: '2026-03-25T11:23:00.000Z'
  })
  updatedAt: Date;
}

class CompanyInfoResponse {
  @ApiProperty({
    description: 'Company name',
    example: 'Velora'
  })
  name: string;

  @ApiProperty({
    description: 'Company tagline',
    example: 'Premium E-Commerce Solutions'
  })
  tagline: string;

  @ApiProperty({
    description: 'Company address',
    example: '123 Business Avenue, New York, NY 10001'
  })
  address: string;

  @ApiProperty({
    description: 'Company email',
    example: 'contact@velora.com'
  })
  email: string;

  @ApiProperty({
    description: 'Company phone',
    example: '+1 (555) 123-4567'
  })
  phone: string;

  @ApiProperty({
    description: 'Company website',
    example: 'https://velora.com'
  })
  website: string;

  @ApiProperty({
    description: 'Company logo URL',
    example: 'https://res.cloudinary.com/your-cloud-name/image/upload/v1/company-logo/main-logo.png'
  })
  logoUrl: string;

  @ApiProperty({
    description: 'Last updated timestamp',
    example: '2026-03-25T11:23:00.000Z'
  })
  updatedAt: Date;
}

class UpdateCompanyInfoResponse {
  @ApiProperty({
    description: 'Success message',
    example: 'Company information updated successfully'
  })
  message: string;

  @ApiProperty({
    description: 'Updated company information',
    type: CompanyInfoResponse
  })
  data: CompanyInfoResponse;
}

@ApiTags('Settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) { }

  @Get('company-logo')
  @ApiOperation({
    summary: 'Get company logo URL',
    description: 'Retrieve the current company logo URL. This endpoint is public and can be called without authentication.'
  })
  @ApiResponse({
    status: 200,
    description: 'Company logo URL retrieved successfully',
    type: CompanyLogoResponse
  })
  @ApiResponse({
    status: 404,
    description: 'Company logo not found'
  })
  async getCompanyLogo() {
    return await this.settingsService.getCompanyLogo();
  }

  @Post('company-logo')
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserType.ADMIN, UserType.SUBADMIN)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload company logo (Admin only)',
    description: 'Upload a new company logo. Only ADMIN and SUBADMIN users can access this endpoint. The logo will be stored on Cloudinary and used in invoices and other company materials.'
  })
  @ApiBody({
    description: 'Company logo file to upload',
    type: UploadLogoDto
  })
  @ApiResponse({
    status: 201,
    description: 'Company logo uploaded successfully',
    type: UploadLogoResponse
  })
  @ApiResponse({
    status: 400,
    description: 'No file uploaded or invalid file format'
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required'
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required'
  })
  @ApiResponse({
    status: 500,
    description: 'Failed to upload logo'
  })
  @UseInterceptors(FileInterceptor('logo'))
  async uploadCompanyLogo(
    @UploadedFile() file: MulterFile,
  ) {
    return await this.settingsService.uploadCompanyLogo(file);
  }

  @Put('company-logo')
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserType.ADMIN, UserType.SUBADMIN)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Update company logo (Admin only)',
    description: 'Update the existing company logo. This will overwrite the current logo. Only ADMIN and SUBADMIN users can access this endpoint.'
  })
  @ApiBody({
    description: 'New company logo file to upload',
    type: UploadLogoDto
  })
  @ApiResponse({
    status: 200,
    description: 'Company logo updated successfully',
    type: UploadLogoResponse
  })
  @ApiResponse({
    status: 400,
    description: 'No file uploaded or invalid file format'
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required'
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required'
  })
  @ApiResponse({
    status: 500,
    description: 'Failed to update logo'
  })
  @UseInterceptors(FileInterceptor('logo'))
  async updateCompanyLogo(
    @UploadedFile() file: MulterFile,
  ) {
    return await this.settingsService.updateCompanyLogo(file);
  }

  @Get('company-info')
  @ApiOperation({
    summary: 'Get company information',
    description: 'Retrieve current company information including name, address, contact details, and logo URL. This endpoint is public.'
  })
  @ApiResponse({
    status: 200,
    description: 'Company information retrieved successfully',
    type: CompanyInfoResponse
  })
  @ApiResponse({
    status: 404,
    description: 'Company information not found'
  })
  async getCompanyInfo() {
    return await this.settingsService.getCompanyInfo();
  }

  @Put('company-info')
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserType.ADMIN, UserType.SUBADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update company information (Admin only)',
    description: 'Update company information such as name, address, contact details, etc. Only ADMIN and SUBADMIN users can access this endpoint.'
  })
  @ApiBody({
    description: 'Company information to update',
    type: CompanyInfoDto
  })
  @ApiResponse({
    status: 200,
    description: 'Company information updated successfully',
    type: UpdateCompanyInfoResponse
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid data provided'
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required'
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required'
  })
  async updateCompanyInfo(@Body() updateData: CompanyInfoDto) {
    return await this.settingsService.updateCompanyInfo(updateData);
  }
}
