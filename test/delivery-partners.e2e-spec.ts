/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, CanActivate } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { UserType } from '../src/core/constants/app.constants';
import { DeliveryPartnerController } from '../src/domain/delivery-partners/delivery-partners.controller';
import { DeliveryPartnerManagementController } from '../src/domain/delivery-partners/delivery-partner-management.controller';
import { DeliveryPartnerService } from '../src/domain/delivery-partners/delivery-partners.service';
import { AuthGuard } from '../src/core/guards/auth.guard';
import { RoleGuard } from '../src/core/guards/role.guard';

describe('DeliveryPartnerController (e2e)', () => {
  let app: INestApplication<App>;

  const mockPartner = {
    id: 'partner-uuid',
    user: { id: 'user-uuid', email: 'partner@example.com' },
    vehicleType: 'Bike',
    vehicleName: 'Honda Shine',
    isVerified: true,
    createdAt: new Date(),
  };

  const mockDashboard = {
    invitations: [],
    activeOrders: [],
    status: { isOnline: true, isAvailable: true },
  };

  const mockDeliveryPartnerService = {
    register: jest.fn().mockResolvedValue(mockPartner),
    updateLocation: jest.fn().mockResolvedValue({ id: 'status-uuid', currentLat: 40.7128, currentLng: -74.006 }),
    toggleOnlineStatus: jest.fn().mockResolvedValue({ id: 'status-uuid', isOnline: true }),
    getMyDashboard: jest.fn().mockResolvedValue(mockDashboard),
    acceptRequest: jest.fn().mockResolvedValue({ id: 'request-uuid', status: 2 }),
    rejectRequest: jest.fn().mockResolvedValue({ message: 'Request rejected' }),
    listAllPartners: jest.fn().mockResolvedValue({
      data: [mockPartner],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    }),
    toggleVerification: jest.fn().mockResolvedValue({ ...mockPartner, isVerified: false }),
    deletePartner: jest.fn().mockResolvedValue(mockPartner),
  };

  const mockAuthGuard: CanActivate = {
    canActivate: jest.fn().mockImplementation((context) => {
      const req = context.switchToHttp().getRequest();
      req.user = {
        id: 'user-uuid',
        email: 'partner@example.com',
        type: 3,
        userType: UserType.DELIVERY_PARTNER,
      };
      return true;
    }),
  };

  const mockRoleGuard: CanActivate = {
    canActivate: jest.fn().mockReturnValue(true),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [DeliveryPartnerController, DeliveryPartnerManagementController],
      providers: [
        {
          provide: DeliveryPartnerService,
          useValue: mockDeliveryPartnerService,
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue(mockAuthGuard)
      .overrideGuard(RoleGuard)
      .useValue(mockRoleGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await app.init();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
    jest.clearAllMocks();
  });

  describe('POST /delivery-partners/register', () => {
    it('should register delivery partner successfully', async () => {
      const registerDto = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'Password@123',
        vehicleType: 'Bike',
        vehicleName: 'Honda Shine',
        addressLine1: '123 Main St',
        state: 'NY',
        latitude: 40.7128,
        longitude: -74.006,
      };

      const response = await request(app.getHttpServer())
        .post('/delivery-partners/register')
        .field('name', registerDto.name)
        .field('email', registerDto.email)
        .field('password', registerDto.password)
        .field('vehicleType', registerDto.vehicleType)
        .field('vehicleName', registerDto.vehicleName)
        .field('addressLine1', registerDto.addressLine1)
        .field('state', registerDto.state)
        .field('latitude', registerDto.latitude)
        .field('longitude', registerDto.longitude)
        .attach('rcBookPhoto', Buffer.from('test'), 'rc.jpg')
        .expect(201);

      expect(response.body).toBeDefined();
    });

    it('should return 400 when name is missing', async () => {
      await request(app.getHttpServer())
        .post('/delivery-partners/register')
        .field('email', 'john@example.com')
        .field('password', 'Password@123')
        .field('vehicleType', 'Bike')
        .field('vehicleName', 'Honda Shine')
        .field('addressLine1', '123 Main St')
        .field('state', 'NY')
        .field('latitude', 40.7128)
        .field('longitude', -74.006)
        .expect(400);
    });

    it('should return 400 for invalid email format', async () => {
      await request(app.getHttpServer())
        .post('/delivery-partners/register')
        .field('name', 'John Doe')
        .field('email', 'invalid-email')
        .field('password', 'Password@123')
        .field('vehicleType', 'Bike')
        .field('vehicleName', 'Honda Shine')
        .field('addressLine1', '123 Main St')
        .field('state', 'NY')
        .field('latitude', 40.7128)
        .field('longitude', -74.006)
        .expect(400);
    });

    it('should return 400 when latitude is out of range', async () => {
      await request(app.getHttpServer())
        .post('/delivery-partners/register')
        .field('name', 'John Doe')
        .field('email', 'john@example.com')
        .field('password', 'Password@123')
        .field('vehicleType', 'Bike')
        .field('vehicleName', 'Honda Shine')
        .field('addressLine1', '123 Main St')
        .field('state', 'NY')
        .field('latitude', 100)
        .field('longitude', -74.006)
        .expect(400);
    });
  });

  describe('PATCH /delivery-partners/location', () => {
    it('should update location successfully', async () => {
      const response = await request(app.getHttpServer())
        .patch('/delivery-partners/location')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send({ lat: 40.7128, lng: -74.006 })
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should return 400 when lat is missing', async () => {
      await request(app.getHttpServer())
        .patch('/delivery-partners/location')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send({ lng: -74.006 })
        .expect(400);
    });

    it('should return 400 when lng is missing', async () => {
      await request(app.getHttpServer())
        .patch('/delivery-partners/location')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send({ lat: 40.7128 })
        .expect(400);
    });
  });

  describe('PATCH /delivery-partners/status', () => {
    it('should toggle online status', async () => {
      const response = await request(app.getHttpServer())
        .patch('/delivery-partners/status')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send({ isOnline: true })
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should return 400 when isOnline is missing', async () => {
      await request(app.getHttpServer())
        .patch('/delivery-partners/status')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send({})
        .expect(400);
    });
  });

  describe('GET /delivery-partners/dashboard', () => {
    it('should return dashboard data', async () => {
      const response = await request(app.getHttpServer())
        .get('/delivery-partners/dashboard')
        .set('Authorization', 'Bearer mock-jwt-token')
        .expect(200);

      expect(response.body.invitations).toBeDefined();
      expect(response.body.activeOrders).toBeDefined();
      expect(response.body.status).toBeDefined();
    });
  });

  describe('PATCH /delivery-partners/requests/:id/accept', () => {
    it('should accept request successfully', async () => {
      const response = await request(app.getHttpServer())
        .patch('/delivery-partners/requests/request-uuid/accept')
        .set('Authorization', 'Bearer mock-jwt-token')
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should handle any request id format', async () => {
      const customId = 'custom-request-id';
      await request(app.getHttpServer())
        .patch(`/delivery-partners/requests/${customId}/accept`)
        .set('Authorization', 'Bearer mock-jwt-token')
        .expect(200);

      expect(mockDeliveryPartnerService.acceptRequest).toHaveBeenCalledWith(customId, 'user-uuid');
    });
  });

  describe('PATCH /delivery-partners/requests/:id/reject', () => {
    it('should reject request successfully', async () => {
      const response = await request(app.getHttpServer())
        .patch('/delivery-partners/requests/request-uuid/reject')
        .set('Authorization', 'Bearer mock-jwt-token')
        .expect(200);

      expect(response.body.message).toBe('Request rejected');
    });
  });

  describe('GET /delivery-partner-management', () => {
    it('should return paginated partners', async () => {
      const response = await request(app.getHttpServer())
        .get('/delivery-partner-management?page=1&limit=10')
        .set('Authorization', 'Bearer mock-jwt-token')
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.total).toBe(1);
    });
  });

  describe('PATCH /delivery-partner-management/:id/verify', () => {
    it('should verify partner', async () => {
      const response = await request(app.getHttpServer())
        .patch('/delivery-partner-management/partner-uuid/verify')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send({ isVerified: true })
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should unverify partner', async () => {
      const response = await request(app.getHttpServer())
        .patch('/delivery-partner-management/partner-uuid/verify')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send({ isVerified: false })
        .expect(200);

      expect(response.body.isVerified).toBe(false);
    });
  });

  describe('DELETE /delivery-partner-management/:id', () => {
    it('should delete partner successfully', async () => {
      const response = await request(app.getHttpServer())
        .delete('/delivery-partner-management/partner-uuid')
        .set('Authorization', 'Bearer mock-jwt-token')
        .expect(200);

      expect(response.body).toBeDefined();
    });
  });
});
