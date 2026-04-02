import { Test, TestingModule } from '@nestjs/testing';
import { DeliveryPartnerManagementController } from '../delivery-partner-management.controller';
import { DeliveryPartnerService } from '../delivery-partners.service';
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

describe('DeliveryPartnerManagementController - Comprehensive', () => {
  let controller: DeliveryPartnerManagementController;
  let service: jest.Mocked<DeliveryPartnerService>;

  const mockAdminToken = {
    id: 'admin-uuid',
    email: 'admin@example.com',
    type: 2,
    userType: UserType.ADMIN,
  };

  const mockPartner = {
    id: 'partner-uuid',
    user: { id: 'user-uuid', email: 'partner@example.com', name: 'John Doe' },
    vehicleType: 'Bike',
    vehicleName: 'Honda Shine',
    isVerified: true,
    status: { isOnline: true, isAvailable: true },
  };

  const mockPartnerService = {
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeliveryPartnerManagementController],
      providers: [
        {
          provide: DeliveryPartnerService,
          useValue: mockPartnerService,
        },
      ],
    }).compile();

    controller = module.get<DeliveryPartnerManagementController>(DeliveryPartnerManagementController);
    service = module.get(DeliveryPartnerService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('listAllPartners - Query Parameter Validation', () => {
    it('should call service with default pagination', async () => {
      await controller.listAllPartners(1, 10);

      expect(service.listAllPartners).toHaveBeenCalledWith(1, 10);
    });

    it('should pass custom pagination values', async () => {
      await controller.listAllPartners(2, 20);

      expect(service.listAllPartners).toHaveBeenCalledWith(2, 20);
    });

    it('should return paginated partners', async () => {
      const result = await controller.listAllPartners(1, 10);

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page');
      expect(result).toHaveProperty('limit');
      expect(result).toHaveProperty('totalPages');
    });
  });

  describe('toggleVerification - Route Parameter and Body', () => {
    it('should verify partner when isVerified is true', async () => {
      const partnerId = 'partner-uuid';
      const isVerified = true;

      const result = await controller.toggleVerification(partnerId, isVerified);

      expect(service.toggleVerification).toHaveBeenCalledWith(partnerId, true);
    });

    it('should unverify partner when isVerified is false', async () => {
      const partnerId = 'partner-uuid';
      const isVerified = false;

      await controller.toggleVerification(partnerId, isVerified);

      expect(service.toggleVerification).toHaveBeenCalledWith(partnerId, false);
    });

    it('should handle any partner id format', async () => {
      const customId = 'custom-partner-id';

      await controller.toggleVerification(customId, true);

      expect(service.toggleVerification).toHaveBeenCalledWith(customId, true);
    });
  });

  describe('deletePartner - Route Parameter', () => {
    it('should pass partner id to service', async () => {
      const partnerId = 'partner-uuid';

      const result = await controller.deletePartner(partnerId);

      expect(service.deletePartner).toHaveBeenCalledWith(partnerId);
    });

    it('should return deleted partner', async () => {
      const result = await controller.deletePartner('partner-uuid');

      expect(result).toEqual(mockPartner);
    });

    it('should handle any partner id format', async () => {
      const customId = 'delete-partner-id';

      await controller.deletePartner(customId);

      expect(service.deletePartner).toHaveBeenCalledWith(customId);
    });
  });
});
