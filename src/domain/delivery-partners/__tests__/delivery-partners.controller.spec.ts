import { Test, TestingModule } from '@nestjs/testing';
import { DeliveryPartnerController } from '../delivery-partners.controller';
import { DeliveryPartnerService } from '../delivery-partners.service';
import { UserType } from '../../../core/constants/app.constants';
import { AuthGuard } from '../../../core/guards/auth.guard';

jest.mock('../../../core/guards/auth.guard', () => ({
  AuthGuard: jest.fn().mockImplementation(() => ({
    canActivate: jest.fn().mockReturnValue(true),
  })),
}));

describe('DeliveryPartnerController - Comprehensive', () => {
  let controller: DeliveryPartnerController;
  let service: jest.Mocked<DeliveryPartnerService>;

  const mockUserToken = {
    id: 'user-uuid',
    email: 'partner@example.com',
    type: 3,
    userType: UserType.DELIVERY_PARTNER,
  };

  const mockPartner = {
    id: 'partner-uuid',
    user: { id: 'user-uuid', email: 'partner@example.com' },
    vehicleType: 'Bike',
    vehicleName: 'Honda Shine',
    isVerified: true,
  };

  const mockDashboard = {
    invitations: [],
    activeOrders: [],
    status: { isOnline: true, isAvailable: true },
  };

  const mockPartnerService = {
    register: jest.fn().mockResolvedValue(mockPartner),
    updateLocation: jest.fn().mockResolvedValue({ id: 'status-uuid', currentLat: 40.7128, currentLng: -74.006 }),
    toggleOnlineStatus: jest.fn().mockResolvedValue({ id: 'status-uuid', isOnline: true }),
    getMyDashboard: jest.fn().mockResolvedValue(mockDashboard),
    acceptRequest: jest.fn().mockResolvedValue({ id: 'request-uuid', status: 2 }),
    rejectRequest: jest.fn().mockResolvedValue({ message: 'Request rejected' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeliveryPartnerController],
      providers: [
        {
          provide: DeliveryPartnerService,
          useValue: mockPartnerService,
        },
      ],
    }).compile();

    controller = module.get<DeliveryPartnerController>(DeliveryPartnerController);
    service = module.get(DeliveryPartnerService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register - File Upload and Body', () => {
    it('should register delivery partner with file', async () => {
      const dto = {
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
      const mockFile = { originalname: 'rc.jpg' } as Express.Multer.File;

      const result = await controller.register(dto as any, mockFile);

      expect(result).toEqual(mockPartner);
      expect(service.register).toHaveBeenCalledWith(dto, mockFile);
    });

    it('should register without file', async () => {
      const dto = {
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

      const result = await controller.register(dto as any, undefined as any);

      expect(service.register).toHaveBeenCalledWith(dto, undefined as any);
    });
  });

  describe('updateLocation - Location Update', () => {
    it('should update location with lat and lng', async () => {
      const dto = { lat: 40.7128, lng: -74.006 };

      const result = await controller.updateLocation({ user: mockUserToken } as any, dto);

      expect(service.updateLocation).toHaveBeenCalledWith('user-uuid', 40.7128, -74.006);
    });

    it('should pass user id from token', async () => {
      const dto = { lat: 41.0, lng: -75.0 };

      await controller.updateLocation({ user: { id: 'different-user' } } as any, dto);

      expect(service.updateLocation).toHaveBeenCalledWith('different-user', 41.0, -75.0);
    });
  });

  describe('toggleStatus - Online Status', () => {
    it('should toggle online status to true', async () => {
      const dto = { isOnline: true };

      const result = await controller.toggleStatus({ user: mockUserToken } as any, dto);

      expect(service.toggleOnlineStatus).toHaveBeenCalledWith('user-uuid', true);
    });

    it('should toggle online status to false', async () => {
      const dto = { isOnline: false };

      await controller.toggleStatus({ user: mockUserToken } as any, dto);

      expect(service.toggleOnlineStatus).toHaveBeenCalledWith('user-uuid', false);
    });
  });

  describe('getDashboard - Dashboard Data', () => {
    it('should return dashboard for authenticated partner', async () => {
      const result = await controller.getDashboard({ user: mockUserToken } as any);

      expect(result).toEqual(mockDashboard);
      expect(service.getMyDashboard).toHaveBeenCalledWith('user-uuid');
    });

    it('should pass user id from token', async () => {
      await controller.getDashboard({ user: { id: 'dashboard-user' } } as any);

      expect(service.getMyDashboard).toHaveBeenCalledWith('dashboard-user');
    });
  });

  describe('acceptRequest - Request ID', () => {
    it('should accept request with id', async () => {
      const requestId = 'request-uuid';

      const result = await controller.acceptRequest({ user: mockUserToken } as any, requestId);

      expect(service.acceptRequest).toHaveBeenCalledWith(requestId, 'user-uuid');
    });

    it('should handle any request id format', async () => {
      const customId = 'custom-request-id';

      await controller.acceptRequest({ user: mockUserToken } as any, customId);

      expect(service.acceptRequest).toHaveBeenCalledWith(customId, 'user-uuid');
    });
  });

  describe('rejectRequest - Request ID', () => {
    it('should reject request with id', async () => {
      const requestId = 'request-uuid';

      const result = await controller.rejectRequest({ user: mockUserToken } as any, requestId);

      expect(service.rejectRequest).toHaveBeenCalledWith(requestId, 'user-uuid');
      expect(result).toEqual({ message: 'Request rejected' });
    });
  });
});
