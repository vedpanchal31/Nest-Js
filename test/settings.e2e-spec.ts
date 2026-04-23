import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, CanActivate } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { UserType } from '../src/core/constants/app.constants';
import { SettingsController } from '../src/domain/settings/settings.controller';
import { SettingsService } from '../src/domain/settings/settings.service';
import { AuthGuard } from '../src/core/guards/auth.guard';
import { RoleGuard } from '../src/core/guards/role.guard';

describe('SettingsController (e2e)', () => {
  let app: INestApplication<App>;

  const mockSettings = {
    id: 'settings-uuid',
    name: 'Velora',
    tagline: 'Premium E-Commerce Solutions',
    address: '123 Business Avenue, New York, NY 10001',
    email: 'contact@velora.com',
    phone: '+1 (555) 123-4567',
    website: 'https://velora.com',
    logoUrl:
      'https://res.cloudinary.com/dcegoonge/image/upload/v1774418520/company-logo/logo.png',
    updatedAt: new Date().toISOString(),
  };

  const mockSettingsService = {
    getCompanyLogo: jest.fn().mockResolvedValue({
      logoUrl: mockSettings.logoUrl,
      updatedAt: mockSettings.updatedAt,
    }),
    uploadCompanyLogo: jest.fn().mockResolvedValue({
      message: 'Company logo uploaded successfully',
      logoUrl:
        'https://res.cloudinary.com/dcegoonge/image/upload/v1774418520/company-logo/new-logo.png',
      publicId: 'company-logo/new-logo',
      updatedAt: new Date().toISOString(),
    }),
    updateCompanyLogo: jest.fn().mockResolvedValue({
      message: 'Company logo updated successfully',
      logoUrl:
        'https://res.cloudinary.com/dcegoonge/image/upload/v1774418520/company-logo/updated-logo.png',
      publicId: 'company-logo/updated-logo',
      updatedAt: new Date().toISOString(),
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

  const mockAuthGuard: CanActivate = {
    canActivate: jest.fn().mockImplementation((context) => {
      const req = context.switchToHttp().getRequest();
      req.user = {
        id: 'admin-uuid',
        email: 'admin@example.com',
        type: 2,
        userType: UserType.ADMIN,
      };
      return true;
    }),
  };

  const mockRoleGuard: CanActivate = {
    canActivate: jest.fn().mockReturnValue(true),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [SettingsController],
      providers: [
        {
          provide: SettingsService,
          useValue: mockSettingsService,
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue(mockAuthGuard)
      .overrideGuard(RoleGuard)
      .useValue(mockRoleGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true }),
    );
    await app.init();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
    jest.clearAllMocks();
  });

  describe('GET /settings/company-logo', () => {
    it('should return company logo URL (public)', async () => {
      const response = await request(app.getHttpServer())
        .get('/settings/company-logo')
        .expect(200);

      expect(response.body).toHaveProperty('logoUrl');
      expect(response.body.logoUrl).toBe(mockSettings.logoUrl);
      expect(response.body).toHaveProperty('updatedAt');
    });
  });

  describe('POST /settings/company-logo', () => {
    it('should upload company logo successfully (admin)', async () => {
      const response = await request(app.getHttpServer())
        .post('/settings/company-logo')
        .set('Authorization', 'Bearer mock-jwt-token')
        .attach('logo', Buffer.from('test-image'), 'logo.png')
        .expect(201);

      expect(response.body).toHaveProperty(
        'message',
        'Company logo uploaded successfully',
      );
      expect(response.body).toHaveProperty('logoUrl');
      expect(response.body).toHaveProperty('publicId');
    });

    it('should return 500 when no file uploaded', async () => {
      mockSettingsService.uploadCompanyLogo.mockRejectedValue(
        new Error('No file uploaded'),
      );

      await request(app.getHttpServer())
        .post('/settings/company-logo')
        .set('Authorization', 'Bearer mock-jwt-token')
        .expect(500);
    });
  });

  describe('PUT /settings/company-logo', () => {
    it('should update company logo successfully (admin)', async () => {
      const response = await request(app.getHttpServer())
        .put('/settings/company-logo')
        .set('Authorization', 'Bearer mock-jwt-token')
        .attach('logo', Buffer.from('new-logo'), 'new-logo.png')
        .expect(200);

      expect(response.body).toHaveProperty(
        'message',
        'Company logo updated successfully',
      );
      expect(response.body).toHaveProperty('logoUrl');
      expect(response.body).toHaveProperty('publicId');
    });
  });

  describe('GET /settings/company-info', () => {
    it('should return all company information (public)', async () => {
      const response = await request(app.getHttpServer())
        .get('/settings/company-info')
        .expect(200);

      expect(response.body).toHaveProperty('name', mockSettings.name);
      expect(response.body).toHaveProperty('tagline', mockSettings.tagline);
      expect(response.body).toHaveProperty('address', mockSettings.address);
      expect(response.body).toHaveProperty('email', mockSettings.email);
      expect(response.body).toHaveProperty('phone', mockSettings.phone);
      expect(response.body).toHaveProperty('website', mockSettings.website);
      expect(response.body).toHaveProperty('logoUrl', mockSettings.logoUrl);
      expect(response.body).toHaveProperty('updatedAt');
    });
  });

  describe('PUT /settings/company-info', () => {
    it('should update company name (admin)', async () => {
      const response = await request(app.getHttpServer())
        .put('/settings/company-info')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send({ name: 'New Company Name' })
        .expect(200);

      expect(response.body).toHaveProperty(
        'message',
        'Company information updated successfully',
      );
      expect(response.body).toHaveProperty('data');
    });

    it('should update multiple company fields (admin)', async () => {
      const updateData = {
        name: 'Updated Company',
        email: 'new@email.com',
        phone: '+1 999 888 7777',
      };

      const response = await request(app.getHttpServer())
        .put('/settings/company-info')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send(updateData)
        .expect(200);

      expect(mockSettingsService.updateCompanyInfo).toHaveBeenCalledWith(
        updateData,
      );
      expect(response.body.data.name).toBe('Updated Company Name');
    });

    it('should update tagline (admin)', async () => {
      await request(app.getHttpServer())
        .put('/settings/company-info')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send({ tagline: 'New Tagline' })
        .expect(200);

      expect(mockSettingsService.updateCompanyInfo).toHaveBeenCalledWith({
        tagline: 'New Tagline',
      });
    });

    it('should update address (admin)', async () => {
      await request(app.getHttpServer())
        .put('/settings/company-info')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send({ address: 'New Address' })
        .expect(200);

      expect(mockSettingsService.updateCompanyInfo).toHaveBeenCalledWith({
        address: 'New Address',
      });
    });

    it('should update website (admin)', async () => {
      await request(app.getHttpServer())
        .put('/settings/company-info')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send({ website: 'https://newsite.com' })
        .expect(200);

      expect(mockSettingsService.updateCompanyInfo).toHaveBeenCalledWith({
        website: 'https://newsite.com',
      });
    });
  });
});
