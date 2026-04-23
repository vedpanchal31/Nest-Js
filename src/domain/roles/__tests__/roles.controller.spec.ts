import { Test, TestingModule } from '@nestjs/testing';
import { RolesController, PermissionsController } from '../roles.controller';
import { RolesService } from '../roles.service';
import {
  UserType,
  PermissionType,
} from '../../../core/constants/app.constants';
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

describe('RolesController - Comprehensive', () => {
  let controller: RolesController;
  let service: jest.Mocked<RolesService>;

  const mockRole = {
    id: 'role-uuid',
    name: 'Admin',
    description: 'Administrator role',
    type: 1,
    permissions: [],
    createdBy: { id: 'user-uuid' },
  };

  const mockRolesService = {
    getAllRoles: jest.fn().mockResolvedValue([mockRole]),
    getRoleById: jest.fn().mockResolvedValue(mockRole),
    createRole: jest.fn().mockResolvedValue(mockRole),
    updateRole: jest.fn().mockResolvedValue({ ...mockRole, name: 'Updated' }),
    deleteRole: jest.fn().mockResolvedValue(mockRole),
    getPermissionsByRoleId: jest.fn().mockResolvedValue([]),
    updateRolePermissions: jest
      .fn()
      .mockResolvedValue({ ...mockRole, permissions: [] }),
    assignRoleToUser: jest
      .fn()
      .mockResolvedValue({ id: 'user-uuid', roles: [mockRole] }),
    getAllPermissions: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RolesController, PermissionsController],
      providers: [
        {
          provide: RolesService,
          useValue: mockRolesService,
        },
      ],
    }).compile();

    controller = module.get<RolesController>(RolesController);
    service = module.get(RolesService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getAllRoles - List Roles', () => {
    it('should return all roles', async () => {
      const result = await controller.getAllRoles();

      expect(result).toEqual([mockRole]);
      expect(service.getAllRoles).toHaveBeenCalled();
    });
  });

  describe('createRole - Create Role', () => {
    it('should create role with valid data', async () => {
      const dto = { name: 'New Role', description: 'Description', type: 1 };

      const result = await controller.createRole(dto);

      expect(service.createRole).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockRole);
    });

    it('should create role with userId', async () => {
      const dto = {
        name: 'New Role',
        description: 'Description',
        type: 1,
        userId: 'creator-uuid',
      };

      await controller.createRole(dto);

      expect(service.createRole).toHaveBeenCalledWith(dto);
    });
  });

  describe('updateRole - Update Role', () => {
    it('should update role by id', async () => {
      const dto = { name: 'Updated Name' };

      const result = await controller.updateRole('role-uuid', dto);

      expect(service.updateRole).toHaveBeenCalledWith('role-uuid', dto);
      expect(result.name).toBe('Updated');
    });

    it('should handle any id format', async () => {
      const customId = 'custom-role-id';
      await controller.updateRole(customId, { name: 'Updated' });

      expect(service.updateRole).toHaveBeenCalledWith(customId, {
        name: 'Updated',
      });
    });
  });

  describe('deleteRole - Delete Role', () => {
    it('should delete role by id', async () => {
      const result = await controller.deleteRole('role-uuid');

      expect(service.deleteRole).toHaveBeenCalledWith('role-uuid');
      expect(result).toEqual(mockRole);
    });
  });

  describe('assignRole - Assign Role to User', () => {
    it('should assign role to user', async () => {
      const dto = { userId: 'user-uuid', roleId: 'role-uuid' };

      const result = await controller.assignRole(dto);

      expect(service.assignRoleToUser).toHaveBeenCalledWith(dto);
      expect(result).toHaveProperty('roles');
    });
  });

  describe('getPermissionsByRoleId - Get Permissions', () => {
    it('should return permissions for role', async () => {
      const result = await controller.getPermissionsByRoleId('role-uuid');

      expect(service.getPermissionsByRoleId).toHaveBeenCalledWith('role-uuid');
      expect(result).toEqual([]);
    });
  });

  describe('updateRolePermissions - Update Permissions', () => {
    it('should update role permissions', async () => {
      const dto = { permissions: [PermissionType.CREATE_CATEGORY] };

      const result = await controller.updateRolePermissions('role-uuid', dto);

      expect(service.updateRolePermissions).toHaveBeenCalledWith(
        'role-uuid',
        dto,
      );
    });
  });
});

describe('PermissionsController - Comprehensive', () => {
  let controller: PermissionsController;
  let service: jest.Mocked<RolesService>;

  const mockRolesService = {
    getAllPermissions: jest
      .fn()
      .mockResolvedValue([{ id: 'perm-uuid', name: 'CREATE_CATEGORY' }]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PermissionsController],
      providers: [
        {
          provide: RolesService,
          useValue: mockRolesService,
        },
      ],
    }).compile();

    controller = module.get<PermissionsController>(PermissionsController);
    service = module.get(RolesService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getAllPermissions - List Permissions', () => {
    it('should return all permissions', async () => {
      const result = await controller.getAllPermissions();

      expect(service.getAllPermissions).toHaveBeenCalled();
      expect(result).toEqual([{ id: 'perm-uuid', name: 'CREATE_CATEGORY' }]);
    });
  });
});
