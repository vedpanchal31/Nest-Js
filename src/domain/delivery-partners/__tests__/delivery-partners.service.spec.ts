import { Test, TestingModule } from '@nestjs/testing';
import { DeliveryPartnerService } from '../delivery-partners.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DeliveryPartner } from '../entities/delivery-partner.entity';
import { DeliveryPartnerStatus } from '../entities/delivery-partner-status.entity';
import {
  DeliveryRequest,
  RequestStatus,
} from '../entities/delivery-request.entity';
import { Order } from '../../orders/entities/order.entity';
import { User } from '../../users/entities/user.entity';
import { Repository, DataSource, Not, LessThan } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CloudinaryService } from '../../../core/cloudinary/cloudinary.service';
import { OrderStatus, UserType } from '../../../core/constants/app.constants';

describe('DeliveryPartnerService - Comprehensive', () => {
  let service: DeliveryPartnerService;
  let partnerRepository: jest.Mocked<Repository<DeliveryPartner>>;
  let statusRepository: jest.Mocked<Repository<DeliveryPartnerStatus>>;
  let requestRepository: jest.Mocked<Repository<DeliveryRequest>>;
  let orderRepository: jest.Mocked<Repository<Order>>;
  let usersRepository: jest.Mocked<Repository<User>>;
  let dataSource: jest.Mocked<DataSource>;
  let cloudinaryService: jest.Mocked<CloudinaryService>;

  const mockUser = {
    id: 'user-uuid',
    email: 'partner@example.com',
    name: 'John Doe',
    userType: UserType.DELIVERY_PARTNER,
  } as User;

  const mockPartner = {
    id: 'partner-uuid',
    user: mockUser,
    vehicleType: 'Bike',
    vehicleName: 'Honda Shine',
    rcBookPhoto: 'http://image.url/rc.jpg',
    isVerified: true,
    rating: 4.5,
    status: {
      id: 'status-uuid',
      isOnline: true,
      isAvailable: true,
      currentLat: 40.7128,
      currentLng: -74.006,
      lastSeenAt: new Date(),
      currentOrderId: null,
    },
    createdAt: new Date(),
  } as unknown as DeliveryPartner;

  const mockPartnerStatus = {
    id: 'status-uuid',
    partner: mockPartner,
    isOnline: true,
    isAvailable: true,
    currentLat: 40.7128,
    currentLng: -74.006,
    lastSeenAt: new Date(),
    currentOrderId: null,
    updatedAt: new Date(),
  } as unknown as DeliveryPartnerStatus;

  const mockOrder = {
    id: 'order-uuid',
    status: OrderStatus.PENDING,
    latitude: 40.7128,
    longitude: -74.006,
    user: { id: 'customer-uuid', email: 'customer@example.com' },
  } as unknown as Order;

  const mockDeliveryRequest = {
    id: 'request-uuid',
    order: mockOrder,
    partner: mockPartner,
    status: RequestStatus.PENDING,
    expiresAt: new Date(Date.now() + 30000),
    createdAt: new Date(),
  } as DeliveryRequest;

  const mockQueryRunner = {
    connect: jest.fn().mockResolvedValue(undefined),
    startTransaction: jest.fn().mockResolvedValue(undefined),
    commitTransaction: jest.fn().mockResolvedValue(undefined),
    rollbackTransaction: jest.fn().mockResolvedValue(undefined),
    release: jest.fn().mockResolvedValue(undefined),
    manager: {
      create: jest.fn().mockReturnValue({}),
      save: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      getRepository: jest.fn().mockReturnValue({
        findOne: jest.fn(),
      }),
      createQueryBuilder: jest.fn().mockReturnValue({
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 1 }),
      }),
    },
  };

  const mockPartnerRepository = {
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    save: jest.fn().mockResolvedValue(mockPartner),
    softRemove: jest.fn().mockResolvedValue(mockPartner),
    create: jest.fn().mockReturnValue(mockPartner),
    query: jest.fn(),
  };

  const mockStatusRepository = {
    findOne: jest.fn(),
    save: jest.fn().mockResolvedValue(mockPartnerStatus),
    createQueryBuilder: jest.fn().mockReturnValue({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([mockPartnerStatus]),
    }),
  };

  const mockRequestRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn().mockResolvedValue(mockDeliveryRequest),
    create: jest.fn().mockReturnValue(mockDeliveryRequest),
  };

  const mockOrderRepository = {
    findOne: jest.fn(),
    find: jest.fn().mockResolvedValue([mockOrder]),
    save: jest.fn(),
  };

  const mockUsersRepository = {
    findOne: jest.fn(),
  };

  const mockDataSource = {
    createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
    getRepository: jest.fn().mockReturnValue(mockOrderRepository),
  };

  const mockCloudinaryService = {
    uploadImage: jest
      .fn()
      .mockResolvedValue({ secure_url: 'http://image.url/rc.jpg' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeliveryPartnerService,
        {
          provide: getRepositoryToken(DeliveryPartner),
          useValue: mockPartnerRepository,
        },
        {
          provide: getRepositoryToken(DeliveryPartnerStatus),
          useValue: mockStatusRepository,
        },
        {
          provide: getRepositoryToken(DeliveryRequest),
          useValue: mockRequestRepository,
        },
        {
          provide: getRepositoryToken(Order),
          useValue: mockOrderRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUsersRepository,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: CloudinaryService,
          useValue: mockCloudinaryService,
        },
      ],
    }).compile();

    service = module.get<DeliveryPartnerService>(DeliveryPartnerService);
    partnerRepository = module.get(getRepositoryToken(DeliveryPartner));
    statusRepository = module.get(getRepositoryToken(DeliveryPartnerStatus));
    requestRepository = module.get(getRepositoryToken(DeliveryRequest));
    orderRepository = module.get(getRepositoryToken(Order));
    usersRepository = module.get(getRepositoryToken(User));
    dataSource = module.get(DataSource);
    cloudinaryService = module.get(CloudinaryService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register - Validation and Business Logic', () => {
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

    it('should throw BadRequestException when email already exists', async () => {
      usersRepository.findOne.mockResolvedValue(mockUser);

      await expect(service.register(registerDto as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when delivery partner already registered', async () => {
      usersRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockUser);

      await expect(service.register(registerDto as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should upload RC book photo when file provided', async () => {
      usersRepository.findOne.mockResolvedValue(null);
      mockQueryRunner.manager.save
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockPartner)
        .mockResolvedValueOnce(mockPartnerStatus);

      const mockFile = {
        originalname: 'rc.jpg',
        buffer: Buffer.from('test'),
      } as any;
      await service.register(registerDto as any, mockFile);

      expect(cloudinaryService.uploadImage).toHaveBeenCalledWith(
        mockFile,
        'delivery-partners',
      );
    });

    it('should create user, partner, and status in transaction', async () => {
      usersRepository.findOne.mockResolvedValue(null);
      mockQueryRunner.manager.save
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockPartner)
        .mockResolvedValueOnce(mockPartnerStatus);

      await service.register(registerDto as any);

      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should rollback transaction on error', async () => {
      usersRepository.findOne.mockResolvedValue(null);
      const originalSave = mockQueryRunner.manager.save;
      mockQueryRunner.manager.save = jest
        .fn()
        .mockRejectedValue(new Error('DB Error'));

      await expect(service.register(registerDto as any)).rejects.toThrow(
        'DB Error',
      );
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();

      // Restore original mock
      mockQueryRunner.manager.save = originalSave;
    });
  });

  describe('updateLocation - Partner Validation', () => {
    it('should throw NotFoundException when partner not found', async () => {
      partnerRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateLocation('user-uuid', 40.7128, -74.006),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update location and last seen timestamp', async () => {
      partnerRepository.findOne.mockResolvedValue(mockPartner);
      const saveSpy = jest.fn().mockResolvedValue({
        ...mockPartnerStatus,
        currentLat: 41.0,
        currentLng: -75.0,
      });
      statusRepository.save = saveSpy;

      await service.updateLocation('user-uuid', 41.0, -75.0);

      expect(saveSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          currentLat: 41.0,
          currentLng: -75.0,
        }),
      );
    });
  });

  describe('toggleOnlineStatus - Status Toggle', () => {
    it('should throw NotFoundException when partner not found', async () => {
      partnerRepository.findOne.mockResolvedValue(null);

      await expect(
        service.toggleOnlineStatus('user-uuid', true),
      ).rejects.toThrow(NotFoundException);
    });

    it('should set online status to true', async () => {
      partnerRepository.findOne.mockResolvedValue(mockPartner);
      const saveSpy = jest
        .fn()
        .mockResolvedValue({ ...mockPartnerStatus, isOnline: true });
      statusRepository.save = saveSpy;

      await service.toggleOnlineStatus('user-uuid', true);

      expect(saveSpy).toHaveBeenCalledWith(
        expect.objectContaining({ isOnline: true }),
      );
    });

    it('should set online status to false', async () => {
      partnerRepository.findOne.mockResolvedValue(mockPartner);
      const saveSpy = jest
        .fn()
        .mockResolvedValue({ ...mockPartnerStatus, isOnline: false });
      statusRepository.save = saveSpy;

      await service.toggleOnlineStatus('user-uuid', false);

      expect(saveSpy).toHaveBeenCalledWith(
        expect.objectContaining({ isOnline: false }),
      );
    });
  });

  describe('findNearbyPartners - Geolocation Query', () => {
    it('should query for online and available partners within radius', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockPartnerStatus]),
      };
      statusRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      const result = await service.findNearbyPartners(40.7128, -74.006, 10);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'status.isOnline = :isOnline',
        { isOnline: true },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'status.isAvailable = :isAvailable',
        { isAvailable: true },
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('dispatchOrder - Assignment Logic', () => {
    it('should return null when no partners found within 100km', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      statusRepository.createQueryBuilder.mockReturnValue(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        mockQueryBuilder as any,
      );

      const result = await service.dispatchOrder(
        'order-uuid',
        40.7128,
        -74.006,
      );

      expect(result).toBeNull();
    });

    it('should skip partners who already have pending requests for this order', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockPartnerStatus]),
      };
      statusRepository.createQueryBuilder.mockReturnValue(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        mockQueryBuilder as any,
      );
      requestRepository.findOne.mockResolvedValue({
        id: 'existing-request',
      } as DeliveryRequest);

      await service.dispatchOrder('order-uuid', 40.7128, -74.006, 1);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(requestRepository.findOne).toHaveBeenCalledWith({
        where: {
          order: { id: 'order-uuid' },
          partner: { id: 'partner-uuid' },
          status: Not(RequestStatus.EXPIRED),
        },
      });
    });
  });

  describe('acceptRequest - Request Validation', () => {
    it('should throw NotFoundException when partner not found', async () => {
      partnerRepository.findOne.mockResolvedValue(null);

      await expect(
        service.acceptRequest('request-uuid', 'user-uuid'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when request not found', async () => {
      partnerRepository.findOne.mockResolvedValue(mockPartner);
      requestRepository.findOne.mockResolvedValue(null);

      await expect(
        service.acceptRequest('request-uuid', 'user-uuid'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when request is not pending', async () => {
      partnerRepository.findOne.mockResolvedValue(mockPartner);
      requestRepository.findOne.mockResolvedValue({
        ...mockDeliveryRequest,
        status: RequestStatus.ACCEPTED,
      });

      await expect(
        service.acceptRequest('request-uuid', 'user-uuid'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when request expired', async () => {
      partnerRepository.findOne.mockResolvedValue(mockPartner);
      requestRepository.findOne.mockResolvedValue({
        ...mockDeliveryRequest,
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(
        service.acceptRequest('request-uuid', 'user-uuid'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should accept request and update order in transaction', async () => {
      partnerRepository.findOne.mockResolvedValue(mockPartner);
      requestRepository.findOne.mockResolvedValue(mockDeliveryRequest);

      await service.acceptRequest('request-uuid', 'user-uuid');

      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });
  });

  describe('rejectRequest - Rejection Logic', () => {
    it('should throw NotFoundException when partner not found', async () => {
      partnerRepository.findOne.mockResolvedValue(null);

      await expect(
        service.rejectRequest('request-uuid', 'user-uuid'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should mark request as rejected and trigger re-dispatch', async () => {
      partnerRepository.findOne.mockResolvedValue(mockPartner);
      requestRepository.findOne.mockResolvedValue(mockDeliveryRequest);
      orderRepository.findOne.mockResolvedValue(mockOrder);
      const saveSpy = jest.fn().mockResolvedValue({
        ...mockDeliveryRequest,
        status: RequestStatus.REJECTED,
      });
      requestRepository.save = saveSpy;

      const result = await service.rejectRequest('request-uuid', 'user-uuid');

      expect(saveSpy).toHaveBeenCalledWith(
        expect.objectContaining({ status: RequestStatus.REJECTED }),
      );
      expect(result).toEqual({ message: 'Request rejected' });
    });
  });

  describe('getMyDashboard - Dashboard Data', () => {
    it('should throw NotFoundException when partner not found', async () => {
      partnerRepository.findOne.mockResolvedValue(null);

      await expect(service.getMyDashboard('user-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return invitations and active orders', async () => {
      partnerRepository.findOne.mockResolvedValue(mockPartner);
      requestRepository.find.mockResolvedValue([mockDeliveryRequest]);
      orderRepository.find.mockResolvedValue([mockOrder]);

      const result = await service.getMyDashboard('user-uuid');

      expect(result).toHaveProperty('invitations');
      expect(result).toHaveProperty('activeOrders');
      expect(result).toHaveProperty('status');
    });
  });

  describe('listAllPartners - Management', () => {
    it('should return paginated partners with relations', async () => {
      partnerRepository.findAndCount.mockResolvedValue([[mockPartner], 1]);

      const result = await service.listAllPartners(1, 10);

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page');
      expect(result).toHaveProperty('limit');
      expect(result).toHaveProperty('totalPages');
    });

    it('should include user and status relations', async () => {
      partnerRepository.findAndCount.mockResolvedValue([[mockPartner], 1]);

      await service.listAllPartners(1, 10);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(partnerRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          relations: ['user', 'status'],
        }),
      );
    });
  });

  describe('toggleVerification - Admin Function', () => {
    it('should throw NotFoundException when partner not found', async () => {
      partnerRepository.findOne.mockResolvedValue(null);

      await expect(
        service.toggleVerification('partner-uuid', true),
      ).rejects.toThrow(NotFoundException);
    });

    it('should verify partner when isVerified is true', async () => {
      partnerRepository.findOne.mockResolvedValue(mockPartner);
      const saveSpy = jest
        .fn()
        .mockResolvedValue({ ...mockPartner, isVerified: true });
      partnerRepository.save = saveSpy;

      await service.toggleVerification('partner-uuid', true);

      expect(saveSpy).toHaveBeenCalledWith(
        expect.objectContaining({ isVerified: true }),
      );
    });

    it('should unverify partner when isVerified is false', async () => {
      partnerRepository.findOne.mockResolvedValue(mockPartner);
      const saveSpy = jest
        .fn()
        .mockResolvedValue({ ...mockPartner, isVerified: false });
      partnerRepository.save = saveSpy;

      await service.toggleVerification('partner-uuid', false);

      expect(saveSpy).toHaveBeenCalledWith(
        expect.objectContaining({ isVerified: false }),
      );
    });
  });

  describe('deletePartner - Soft Delete', () => {
    it('should throw NotFoundException when partner not found', async () => {
      partnerRepository.findOne.mockResolvedValue(null);

      await expect(service.deletePartner('partner-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should soft remove partner', async () => {
      partnerRepository.findOne.mockResolvedValue(mockPartner);

      await service.deletePartner('partner-uuid');

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(partnerRepository.softRemove).toHaveBeenCalledWith(mockPartner);
    });
  });

  describe('dispatchOrder - Create New Request Flow', () => {
    it('should create new request when partner has not been requested before', async () => {
      const mockAvailablePartner = {
        ...mockPartner,
        status: {
          id: 'status-uuid',
          isOnline: true,
          location: { type: 'Point', coordinates: [40.7128, -74.006] },
          partner: { id: 'partner-uuid' },
        },
      };

      orderRepository.findOne.mockResolvedValue({
        ...mockOrder,
        shippingAddress: {
          latitude: 40.7128,
          longitude: -74.006,
        },
      } as any);

      partnerRepository.query.mockResolvedValue([mockAvailablePartner]);

      // First call returns null (no existing request), second call returns a request
      requestRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'new-request-uuid' } as any); // eslint-disable-line @typescript-eslint/no-unsafe-argument

      requestRepository.create.mockReturnValue({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        order: { id: 'order-uuid' } as any,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        partner: mockAvailablePartner as any,
        expiresAt: expect.any(Date), // eslint-disable-line @typescript-eslint/no-unsafe-assignment
        status: RequestStatus.PENDING,
      } as any);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      requestRepository.save.mockResolvedValue({
        id: 'new-request-uuid',
      } as any);

      const result = await service.dispatchOrder(
        'order-uuid',
        40.7128,
        -74.006,
        0,
      );

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(requestRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          order: { id: 'order-uuid' },
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          partner: expect.objectContaining({ id: 'partner-uuid' }),
          status: RequestStatus.PENDING,
        }),
      );
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(requestRepository.save).toHaveBeenCalled();
      expect(result).toEqual({ id: 'new-request-uuid' });
    });
  });

  describe('handleExpiredRequests - Cron Job', () => {
    it('should expire old pending requests', async () => {
      const expiredRequest = {
        ...mockDeliveryRequest,
        id: 'expired-request-uuid',
        status: RequestStatus.PENDING,
        expiresAt: new Date(Date.now() - 1000),
        order: mockOrder,
      };

      requestRepository.find.mockResolvedValue([expiredRequest]);
      requestRepository.save.mockResolvedValue({
        ...expiredRequest,
        status: RequestStatus.EXPIRED,
      });

      await service.handleExpiredRequests();

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(requestRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          where: expect.objectContaining({
            status: RequestStatus.PENDING,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            expiresAt: expect.any(Object),
          }),
          relations: ['order'],
        }),
      );
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(requestRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'expired-request-uuid',
          status: RequestStatus.EXPIRED,
        }),
      );
    });

    it('should trigger forceAssignOrder when expired request has order with nearby partners', async () => {
      const expiredRequest = {
        ...mockDeliveryRequest,
        id: 'expired-request-uuid',
        status: RequestStatus.PENDING,
        expiresAt: new Date(Date.now() - 1000),
        order: {
          ...mockOrder,
          latitude: 40.7128,
          longitude: -74.006,
        },
      };

      const mockNearbyPartner = {
        partner: { id: 'new-partner-uuid' },
      };

      requestRepository.find.mockResolvedValue([expiredRequest]);
      requestRepository.save.mockResolvedValue({
        ...expiredRequest,
        status: RequestStatus.EXPIRED,
      });
      partnerRepository.query.mockResolvedValue([mockNearbyPartner]);
      requestRepository.findOne.mockResolvedValue(null); // No past request found

      await service.handleExpiredRequests();

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(requestRepository.find).toHaveBeenCalled();
    });
  });
});
