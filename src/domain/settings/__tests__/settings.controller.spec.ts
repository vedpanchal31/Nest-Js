import { Test, TestingModule } from '@nestjs/testing';
import { SettingsController } from '../settings.controller';
import { SettingsService } from '../settings.service';
import { UserType } from '../../../core/constants/app.constants';
import { AuthGuard } from '../../../core/guards/auth.guard';
import { RoleGuard } from '../../../core/guards/role.guard';

jest.mock('../../../core/guards/auth.guard', () => ({
  AuthGuard: jest.fn().mockImplementation(() => ({
    canActivate: jest.fn().mockReturnValue(true),
  })),
}));

jest.mock('../../../core/guards/role.guard', () => ({
  RoleGuard: jest.fn().mockImplementation(() => ({
    canActivate: jest.fn().mockReturnValue(true),
  })),
}));

describe('SettingsController - Comprehensive', () => {
  let controller: SettingsController;
  let service: jest.Mocked<SettingsService>;

  const mockSettings = {
    id: 'settings-uuid',
    name: 'Velora',
    tagline: 'Premium E-Commerce Solutions',
    address: '123 Business Avenue, New York, NY 10001',
    email: 'contact@velora.com',
    phone: '+1 (555) 123-4567',
    website: 'https://velora.com',
    logoUrl: 'https://res.cloudinary.com/dcegoonge/image/upload/v1774418520/company-logo/logo.png',
    updatedAt: new Date(),
  };

  const mockSettingsService = {
    getCompanyLogo: jest.fn().mockResolvedValue({
      logoUrl: mockSettings.logoUrl,
      updatedAt: mockSettings.updatedAt,
    }),
    uploadCompanyLogo: jest.fn().mockResolvedValue({
      message: 'Company logo uploaded successfully',
      logoUrl: 'https://res.cloudinary.com/dcegoonge/image/upload/v1774418520/company-logo/new-logo.png',
      publicId: 'company-logo/new-logo',
      updatedAt: new Date(),
    }),
    updateCompanyLogo: jest.fn().mockResolvedValue({
      message: 'Company logo updated successfully',
      logoUrl: 'https://res.cloudinary.com/dcegoonge/image/upload/v1774418520/company-logo/updated-logo.png',
      publicId: 'company-logo/updated-logo',
      updatedAt: new Date(),
    }),
    getCompanyInfo: jest.fn().mockResolvedValue({
      name: mockSettings.name,
      tagline: mockSettings.tagline,
      address: mockSettings.address,
      email: mockSettings.email,
      phone: mockSettings.phone,
      website: mockSettings.website,
      logoUrl: mockSettings.logoUrl,
      updatedAt: mockSettings.updatedAt,
    }),
    updateCompanyInfo: jest.fn().mockResolvedValue({
      message: 'Company information updated successfully',
      data: {
        ...mockSettings,
        name: 'Updated Company Name',
      },
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SettingsController],
      providers: [
        {
          provide: SettingsService,
          useValue: mockSettingsService,
        },
      ],
    }).compile();

    controller = module.get<SettingsController>(SettingsController);
    service = module.get(SettingsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getCompanyLogo - Public Endpoint', () => {
    it('should return company logo URL', async () => {
      const result = await controller.getCompanyLogo();

      expect(result).toHaveProperty('logoUrl', mockSettings.logoUrl);
      expect(result).toHaveProperty('updatedAt');
      expect(service.getCompanyLogo).toHaveBeenCalled();
    });
  });

  describe('uploadCompanyLogo - Admin Only', () => {
    it('should upload logo with file', async () => {
      const mockFile = { originalname: 'logo.png', buffer: Buffer.from('test') } as any;

      const result = await controller.uploadCompanyLogo(mockFile);

      expect(service.uploadCompanyLogo).toHaveBeenCalledWith(mockFile);
      expect(result).toHaveProperty('message', 'Company logo uploaded successfully');
      expect(result).toHaveProperty('logoUrl');
      expect(result).toHaveProperty('publicId');
    });

    it('should handle file upload', async () => {
      const mockFile = { originalname: 'logo.jpg', mimetype: 'image/jpeg', size: 1024 } as any;

      await controller.uploadCompanyLogo(mockFile);

      expect(service.uploadCompanyLogo).toHaveBeenCalledWith(mockFile);
    });
  });

  describe('updateCompanyLogo - Admin Only', () => {
    it('should update logo with file', async () => {
      const mockFile = { originalname: 'new-logo.png', buffer: Buffer.from('test') } as any;

      const result = await controller.updateCompanyLogo(mockFile);

      expect(service.updateCompanyLogo).toHaveBeenCalledWith(mockFile);
      expect(result).toHaveProperty('logoUrl');
      expect(result).toHaveProperty('publicId');
    });
  });

  describe('getCompanyInfo - Public Endpoint', () => {
    it('should return all company information', async () => {
      const result = await controller.getCompanyInfo();

      expect(result).toHaveProperty('name', mockSettings.name);
      expect(result).toHaveProperty('tagline', mockSettings.tagline);
      expect(result).toHaveProperty('address', mockSettings.address);
      expect(result).toHaveProperty('email', mockSettings.email);
      expect(result).toHaveProperty('phone', mockSettings.phone);
      expect(result).toHaveProperty('website', mockSettings.website);
      expect(result).toHaveProperty('logoUrl', mockSettings.logoUrl);
      expect(result).toHaveProperty('updatedAt');
    });
  });

  describe('updateCompanyInfo - Admin Only', () => {
    it('should update company name', async () => {
      const updateData = { name: 'New Company Name' };

      const result = await controller.updateCompanyInfo(updateData as any);

      expect(service.updateCompanyInfo).toHaveBeenCalledWith(updateData);
      expect(result.message).toBe('Company information updated successfully');
    });

    it('should update multiple fields', async () => {
      const updateData = {
        name: 'New Name',
        email: 'new@email.com',
        phone: '+1 999 888 7777',
      };

      await controller.updateCompanyInfo(updateData as any);

      expect(service.updateCompanyInfo).toHaveBeenCalledWith(updateData);
    });

    it('should update tagline', async () => {
      const updateData = { tagline: 'New Tagline' };

      await controller.updateCompanyInfo(updateData as any);

      expect(service.updateCompanyInfo).toHaveBeenCalledWith(updateData);
    });

    it('should update address', async () => {
      const updateData = { address: 'New Address' };

      await controller.updateCompanyInfo(updateData as any);

      expect(service.updateCompanyInfo).toHaveBeenCalledWith(updateData);
    });

    it('should update website', async () => {
      const updateData = { website: 'https://newsite.com' };

      await controller.updateCompanyInfo(updateData as any);

      expect(service.updateCompanyInfo).toHaveBeenCalledWith(updateData);
    });

    it('should return updated data', async () => {
      const updateData = { name: 'Updated Company' };

      const result = await controller.updateCompanyInfo(updateData as any);

      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('name');
      expect(result.data).toHaveProperty('logoUrl');
    });
  });
});
