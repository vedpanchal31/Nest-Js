import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from '../users.controller';
import { UsersService } from '../users.service';
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

describe('UsersController', () => {
  let controller: UsersController;
  let service: jest.Mocked<UsersService>;

  const mockUser = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Test User',
    email: 'test@example.com',
    password: 'hashedPassword123',
    isEmailVerified: true,
    userType: UserType.USER,
    profile: {
      id: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Test User',
      email: 'test@example.com',
      countryCode: '+1',
      countryShortcode: 'US',
      mobile: '1234567890',
      address: '123 Main St',
    },
    roles: [],
    products: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: undefined,
  } as any;

  const mockUsersService = {
    getAllUsers: jest.fn(),
    findOne: jest.fn(),
    updateProfile: jest.fn(),
    removeUser: jest.fn(),
  };

  const mockTokenPayload = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'test@example.com',
    type: 2,
    userType: UserType.USER,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get(UsersService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getUsers', () => {
    it('should return paginated users list', async () => {
      const mockResponse = {
        users: [mockUser],
        total: 1,
        page: 1,
        limit: 10,
      };
      service.getAllUsers.mockResolvedValue(mockResponse);

      const result = await controller.getUsers(1, 10, undefined, undefined);

      expect(service.getAllUsers).toHaveBeenCalledWith(1, 10, undefined, undefined);
      expect(result).toEqual(mockResponse);
    });

    it('should pass search and userType parameters', async () => {
      const mockResponse = {
        users: [mockUser],
        total: 1,
        page: 1,
        limit: 10,
      };
      service.getAllUsers.mockResolvedValue(mockResponse);

      await controller.getUsers(1, 10, 'test', UserType.ADMIN);

      expect(service.getAllUsers).toHaveBeenCalledWith(1, 10, 'test', UserType.ADMIN);
    });
  });

  describe('getProfile', () => {
    it('should return user profile for authenticated user', async () => {
      service.findOne.mockResolvedValue(mockUser as any);
      const mockRequest = { user: mockTokenPayload } as any;

      const result = await controller.getProfile(mockRequest);

      expect(service.findOne).toHaveBeenCalledWith(mockTokenPayload.id);
      expect(result).toEqual(mockUser);
    });

    it('should include profile data in response', async () => {
      service.findOne.mockResolvedValue(mockUser as any);
      const mockRequest = { user: mockTokenPayload } as any;

      const result = await controller.getProfile(mockRequest);

      expect(result.profile).toBeDefined();
      expect(result.profile!.name).toBe('Test User');
    });
  });

  describe('updateProfile', () => {
    const updateProfileDto = {
      name: 'Updated Name',
      address: '456 New Address',
      mobile: '9876543210',
      countryCode: '+44',
      countryShortcode: 'GB',
    };

    it('should update user profile successfully', async () => {
      const updatedUser = {
        ...mockUser,
        name: updateProfileDto.name,
        profile: {
          ...mockUser.profile,
          ...updateProfileDto,
        },
      };
      service.updateProfile.mockResolvedValue(updatedUser as any);
      const mockRequest = { user: mockTokenPayload } as any;

      const result = await controller.updateProfile(mockRequest, updateProfileDto as any);

      expect(service.updateProfile).toHaveBeenCalledWith(mockTokenPayload.id, updateProfileDto);
      expect(result.name).toBe(updateProfileDto.name);
    });

    it('should pass correct user id from token', async () => {
      service.updateProfile.mockResolvedValue(mockUser as any);
      const mockRequest = { user: mockTokenPayload } as any;

      await controller.updateProfile(mockRequest, updateProfileDto as any);

      expect(service.updateProfile).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440000',
        expect.any(Object),
      );
    });
  });

  describe('remove', () => {
    it('should soft delete user account', async () => {
      service.removeUser.mockResolvedValue(mockUser as any);
      const mockRequest = { user: mockTokenPayload } as any;

      const result = await controller.remove(mockRequest);

      expect(service.removeUser).toHaveBeenCalledWith(mockTokenPayload.id);
      expect(result).toEqual(mockUser);
    });

    it('should call removeUser with correct id from token', async () => {
      service.removeUser.mockResolvedValue(mockUser as any);
      const mockRequest = { user: mockTokenPayload } as any;

      await controller.remove(mockRequest);

      expect(service.removeUser).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440000');
    });
  });
});
