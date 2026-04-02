import { Test, TestingModule } from '@nestjs/testing';
import { SettingsService } from '../settings.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Settings } from '../entities/settings.entity';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { CloudinaryService } from '../../../core/cloudinary/cloudinary.service';

describe('SettingsService - Comprehensive', () => {
  let service: SettingsService;
  let settingsRepository: jest.Mocked<Repository<Settings>>;
  let cloudinaryService: jest.Mocked<CloudinaryService>;

  const mockSettings = {
    id: 'settings-uuid',
    name: 'Velora',
    tagline: 'Premium E-Commerce Solutions',
    address: '123 Business Avenue, New York, NY 10001',
    email: 'contact@velora.com',
    phone: '+1 (555) 123-4567',
    website: 'https://velora.com',
    logoUrl: 'https://res.cloudinary.com/dcegoonge/image/upload/v1774418520/company-logo/hugpvjg6op8enixjsrhk.png',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Settings;

  const mockSettingsRepository = {
    findOne: jest.fn(),
    create: jest.fn().mockReturnValue(mockSettings),
    save: jest.fn().mockResolvedValue(mockSettings),
  };

  const mockCloudinaryService = {
    uploadImage: jest.fn().mockResolvedValue({
      secure_url: 'https://res.cloudinary.com/dcegoonge/image/upload/v1774418520/company-logo/new-logo.png',
      public_id: 'company-logo/new-logo',
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsService,
        {
          provide: getRepositoryToken(Settings),
          useValue: mockSettingsRepository,
        },
        {
          provide: CloudinaryService,
          useValue: mockCloudinaryService,
        },
      ],
    }).compile();

    service = module.get<SettingsService>(SettingsService);
    settingsRepository = module.get(getRepositoryToken(Settings));
    cloudinaryService = module.get(CloudinaryService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getOrCreateSettings - Settings Retrieval', () => {
    it('should return existing settings when found', async () => {
      settingsRepository.findOne.mockResolvedValue(mockSettings);

      const result = await (service as any).getOrCreateSettings();

      expect(result).toEqual(mockSettings);
      expect(settingsRepository.create).not.toHaveBeenCalled();
    });

    it('should create new settings when none exists', async () => {
      settingsRepository.findOne.mockResolvedValue(null);

      const result = await (service as any).getOrCreateSettings();

      expect(settingsRepository.create).toHaveBeenCalledWith({});
      expect(settingsRepository.save).toHaveBeenCalled();
      expect(result).toEqual(mockSettings);
    });
  });

  describe('getCompanyLogo - Logo Retrieval', () => {
    it('should return logo URL and updatedAt', async () => {
      settingsRepository.findOne.mockResolvedValue(mockSettings);

      const result = await service.getCompanyLogo();

      expect(result).toHaveProperty('logoUrl', mockSettings.logoUrl);
      expect(result).toHaveProperty('updatedAt');
    });

    it('should create settings if none exists', async () => {
      settingsRepository.findOne.mockResolvedValue(null);

      await service.getCompanyLogo();

      expect(settingsRepository.create).toHaveBeenCalled();
      expect(settingsRepository.save).toHaveBeenCalled();
    });
  });

  describe('uploadCompanyLogo - File Upload', () => {
    it('should throw NotFoundException when no file provided', async () => {
      await expect(service.uploadCompanyLogo(undefined as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should upload logo to Cloudinary and update settings', async () => {
      settingsRepository.findOne.mockResolvedValue(mockSettings);
      const mockFile = { originalname: 'logo.png', buffer: Buffer.from('test') } as any;

      const result = await service.uploadCompanyLogo(mockFile);

      expect(cloudinaryService.uploadImage).toHaveBeenCalledWith(mockFile, 'company-logo');
      expect(settingsRepository.save).toHaveBeenCalled();
      expect(result).toHaveProperty('message', 'Company logo uploaded successfully');
      expect(result).toHaveProperty('logoUrl');
      expect(result).toHaveProperty('publicId');
    });

    it('should throw error when Cloudinary upload fails', async () => {
      const mockFile = { originalname: 'logo.png', buffer: Buffer.from('test') } as any;
      cloudinaryService.uploadImage.mockRejectedValue(new Error('Upload failed'));

      await expect(service.uploadCompanyLogo(mockFile)).rejects.toThrow(
        'Failed to upload logo: Upload failed',
      );
    });
  });

  describe('updateCompanyLogo - Logo Update', () => {
    it('should call uploadCompanyLogo with same logic', async () => {
      settingsRepository.findOne.mockResolvedValue(mockSettings);
      // Reset the mock from previous test
      cloudinaryService.uploadImage.mockResolvedValue({
        secure_url: 'https://res.cloudinary.com/dcegoonge/image/upload/v1774418520/company-logo/new-logo.png',
        public_id: 'company-logo/new-logo',
      });
      const mockFile = { originalname: 'logo.png', buffer: Buffer.from('test') } as any;

      const result = await service.updateCompanyLogo(mockFile);

      expect(cloudinaryService.uploadImage).toHaveBeenCalled();
      expect(result).toHaveProperty('message', 'Company logo uploaded successfully');
    });
  });

  describe('getCompanyInfo - Company Information', () => {
    it('should return all company information fields', async () => {
      settingsRepository.findOne.mockResolvedValue(mockSettings);

      const result = await service.getCompanyInfo();

      expect(result).toHaveProperty('name', mockSettings.name);
      expect(result).toHaveProperty('tagline', mockSettings.tagline);
      expect(result).toHaveProperty('address', mockSettings.address);
      expect(result).toHaveProperty('email', mockSettings.email);
      expect(result).toHaveProperty('phone', mockSettings.phone);
      expect(result).toHaveProperty('website', mockSettings.website);
      expect(result).toHaveProperty('logoUrl', mockSettings.logoUrl);
      expect(result).toHaveProperty('updatedAt');
    });

    it('should create settings if none exists', async () => {
      settingsRepository.findOne.mockResolvedValue(null);

      await service.getCompanyInfo();

      expect(settingsRepository.create).toHaveBeenCalled();
      expect(settingsRepository.save).toHaveBeenCalled();
    });
  });

  describe('updateCompanyInfo - Partial Updates', () => {
    it('should update name when provided', async () => {
      settingsRepository.findOne.mockResolvedValue(mockSettings);
      const saveSpy = jest.fn().mockResolvedValue({ ...mockSettings, name: 'New Company Name' });
      settingsRepository.save = saveSpy;

      const result = await service.updateCompanyInfo({ name: 'New Company Name' });

      expect(saveSpy).toHaveBeenCalledWith(expect.objectContaining({ name: 'New Company Name' }));
      expect(result.data.name).toBe('New Company Name');
    });

    it('should update tagline when provided', async () => {
      settingsRepository.findOne.mockResolvedValue(mockSettings);
      const saveSpy = jest.fn().mockResolvedValue({ ...mockSettings, tagline: 'New Tagline' });
      settingsRepository.save = saveSpy;

      const result = await service.updateCompanyInfo({ tagline: 'New Tagline' });

      expect(saveSpy).toHaveBeenCalledWith(expect.objectContaining({ tagline: 'New Tagline' }));
      expect(result.data.tagline).toBe('New Tagline');
    });

    it('should update address when provided', async () => {
      settingsRepository.findOne.mockResolvedValue(mockSettings);
      const saveSpy = jest.fn().mockResolvedValue({ ...mockSettings, address: 'New Address' });
      settingsRepository.save = saveSpy;

      const result = await service.updateCompanyInfo({ address: 'New Address' });

      expect(saveSpy).toHaveBeenCalledWith(expect.objectContaining({ address: 'New Address' }));
      expect(result.data.address).toBe('New Address');
    });

    it('should update email when provided', async () => {
      settingsRepository.findOne.mockResolvedValue(mockSettings);
      const saveSpy = jest.fn().mockResolvedValue({ ...mockSettings, email: 'new@email.com' });
      settingsRepository.save = saveSpy;

      const result = await service.updateCompanyInfo({ email: 'new@email.com' });

      expect(saveSpy).toHaveBeenCalledWith(expect.objectContaining({ email: 'new@email.com' }));
      expect(result.data.email).toBe('new@email.com');
    });

    it('should update phone when provided', async () => {
      settingsRepository.findOne.mockResolvedValue(mockSettings);
      const saveSpy = jest.fn().mockResolvedValue({ ...mockSettings, phone: '+1 999 888 7777' });
      settingsRepository.save = saveSpy;

      const result = await service.updateCompanyInfo({ phone: '+1 999 888 7777' });

      expect(saveSpy).toHaveBeenCalledWith(expect.objectContaining({ phone: '+1 999 888 7777' }));
      expect(result.data.phone).toBe('+1 999 888 7777');
    });

    it('should update website when provided', async () => {
      settingsRepository.findOne.mockResolvedValue(mockSettings);
      const saveSpy = jest.fn().mockResolvedValue({ ...mockSettings, website: 'https://newsite.com' });
      settingsRepository.save = saveSpy;

      const result = await service.updateCompanyInfo({ website: 'https://newsite.com' });

      expect(saveSpy).toHaveBeenCalledWith(expect.objectContaining({ website: 'https://newsite.com' }));
      expect(result.data.website).toBe('https://newsite.com');
    });

    it('should update multiple fields at once', async () => {
      settingsRepository.findOne.mockResolvedValue(mockSettings);
      const updateData = {
        name: 'New Name',
        email: 'new@email.com',
        phone: '+1 999 888 7777',
      };

      await service.updateCompanyInfo(updateData);

      expect(settingsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Name',
          email: 'new@email.com',
          phone: '+1 999 888 7777',
        }),
      );
    });

    it('should not update undefined fields', async () => {
      settingsRepository.findOne.mockResolvedValue(mockSettings);
      const saveSpy = jest.fn().mockResolvedValue(mockSettings);
      settingsRepository.save = saveSpy;

      await service.updateCompanyInfo({ name: 'New Name' });

      const savedEntity = saveSpy.mock.calls[0][0];
      expect(savedEntity.tagline).toBe(mockSettings.tagline);
      expect(savedEntity.address).toBe(mockSettings.address);
    });

    it('should return success message with updated data', async () => {
      settingsRepository.findOne.mockResolvedValue(mockSettings);

      const result = await service.updateCompanyInfo({ name: 'New Company' });

      expect(result).toHaveProperty('message', 'Company information updated successfully');
      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('name');
      expect(result.data).toHaveProperty('tagline');
      expect(result.data).toHaveProperty('address');
      expect(result.data).toHaveProperty('email');
      expect(result.data).toHaveProperty('phone');
      expect(result.data).toHaveProperty('website');
      expect(result.data).toHaveProperty('logoUrl');
      expect(result.data).toHaveProperty('updatedAt');
    });
  });
});
