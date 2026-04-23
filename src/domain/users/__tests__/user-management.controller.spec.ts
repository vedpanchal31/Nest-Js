import { Test, TestingModule } from '@nestjs/testing';
import { UserManagementController } from '../user-management.controller';
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

describe('UserManagementController', () => {
  let controller: UserManagementController;
  let service: jest.Mocked<UsersService>;

  const mockUser = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Test User',
    email: 'test@example.com',
    password: 'hashedPassword123',
    isEmailVerified: true,
    userType: UserType.SUBADMIN,
    profile: {
      id: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Test User',
      email: 'test@example.com',
    },
    roles: [{ id: 'role-id', name: 'ADMIN' }],
    products: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: undefined,
  } as any;

  const mockUsersService = {
    getAllUsers: jest.fn(),
    findOne: jest.fn(),
    createUser: jest.fn(),
    updateUser: jest.fn(),
    removeUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserManagementController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<UserManagementController>(UserManagementController);
    service = module.get(UsersService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getUsers', () => {
    it('should return paginated users list for admin', async () => {
      const mockResponse = {
        users: [mockUser],
        total: 1,
        page: 1,
        limit: 10,
      };
      service.getAllUsers.mockResolvedValue(mockResponse);

      const result = await controller.getUsers(1, 10, undefined, undefined);

      expect(service.getAllUsers).toHaveBeenCalledWith(
        1,
        10,
        undefined,
        undefined,
      );
      expect(result).toEqual(mockResponse);
    });

    it('should pass search and userType filters', async () => {
      const mockResponse = {
        users: [mockUser],
        total: 1,
        page: 1,
        limit: 10,
      };
      service.getAllUsers.mockResolvedValue(mockResponse);

      await controller.getUsers(1, 10, 'test', UserType.ADMIN);

      expect(service.getAllUsers).toHaveBeenCalledWith(
        1,
        10,
        'test',
        UserType.ADMIN,
      );
    });
  });

  describe('createManagedUser', () => {
    const createDto = {
      name: 'New SubAdmin',
      email: 'newsubadmin@example.com',
      userType: UserType.SUBADMIN,
      roleId: 'role-uuid',
    };

    it('should create a managed user successfully', async () => {
      service.createUser.mockResolvedValue(mockUser);

      const result = await controller.createManagedUser(createDto);

      expect(service.createUser).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(mockUser);
    });

    it('should create user without roleId', async () => {
      const dtoWithoutRole = {
        name: 'New User',
        email: 'newuser@example.com',
        userType: UserType.USER,
      };
      service.createUser.mockResolvedValue(mockUser);

      await controller.createManagedUser(dtoWithoutRole);

      expect(service.createUser).toHaveBeenCalledWith(dtoWithoutRole);
    });
  });

  describe('getUserById', () => {
    it('should return user by id', async () => {
      service.findOne.mockResolvedValue(mockUser);

      const result = await controller.getUserById(mockUser.id);

      expect(service.findOne).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual(mockUser);
    });

    it('should pass correct user id to service', async () => {
      service.findOne.mockResolvedValue(mockUser);
      const userId = '550e8400-e29b-41d4-a716-446655440000';

      await controller.getUserById(userId);

      expect(service.findOne).toHaveBeenCalledWith(userId);
    });
  });

  describe('updateManagedUser', () => {
    const updateDto = {
      name: 'Updated Name',
      userType: UserType.ADMIN,
      roleId: 'new-role-id',
    };

    it('should update managed user successfully', async () => {
      const updatedUser = { ...mockUser, ...updateDto };
      service.updateUser.mockResolvedValue(updatedUser);

      const result = await controller.updateManagedUser(mockUser.id, updateDto);

      expect(service.updateUser).toHaveBeenCalledWith(mockUser.id, updateDto);
      expect(result.name).toBe('Updated Name');
    });

    it('should update user with partial data', async () => {
      const partialUpdate = { name: 'New Name Only' };
      service.updateUser.mockResolvedValue({
        ...mockUser,
        ...partialUpdate,
      });

      await controller.updateManagedUser(mockUser.id, partialUpdate);

      expect(service.updateUser).toHaveBeenCalledWith(
        mockUser.id,
        partialUpdate,
      );
    });

    it('should update user password when provided', async () => {
      const updateWithPassword = {
        password: 'newPassword123',
      };
      service.updateUser.mockResolvedValue(mockUser);

      await controller.updateManagedUser(mockUser.id, updateWithPassword);

      expect(service.updateUser).toHaveBeenCalledWith(
        mockUser.id,
        updateWithPassword,
      );
    });
  });

  describe('deleteUser', () => {
    it('should soft delete user successfully', async () => {
      service.removeUser.mockResolvedValue(mockUser);

      const result = await controller.deleteUser(mockUser.id);

      expect(service.removeUser).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual(mockUser);
    });

    it('should pass correct user id to removeUser', async () => {
      service.removeUser.mockResolvedValue(mockUser);
      const userId = '550e8400-e29b-41d4-a716-446655440000';

      await controller.deleteUser(userId);

      expect(service.removeUser).toHaveBeenCalledWith(userId);
    });
  });
});
