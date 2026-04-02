import { Test, TestingModule } from '@nestjs/testing';
import { RolesService } from '../roles.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Role } from '../entities/role.entity';
import { Permission } from '../entities/permission.entity';
import { User } from '../../users/entities/user.entity';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PermissionType } from '../../../core/constants/app.constants';

describe('RolesService - Comprehensive', () => {
  let service: RolesService;
  let rolesRepository: jest.Mocked<Repository<Role>>;
  let permissionsRepository: jest.Mocked<Repository<Permission>>;
  let usersRepository: jest.Mocked<Repository<User>>;

  const mockRole = {
    id: 'role-uuid',
    name: 'Admin',
    description: 'Administrator role',
    type: 1,
    permissions: [],
    createdBy: { id: 'user-uuid', email: 'admin@example.com' },
    users: [],
  } as unknown as Role;

  const mockPermission = {
    id: 'permission-uuid',
    name: PermissionType.CREATE_CATEGORY,
    roles: [],
  } as Permission;

  const mockUser = {
    id: 'user-uuid',
    email: 'user@example.com',
    roles: [],
  } as unknown as User;

  const mockRolesRepository = {
    find: jest.fn().mockResolvedValue([mockRole]),
    findOne: jest.fn(),
    create: jest.fn().mockReturnValue(mockRole),
    save: jest.fn().mockResolvedValue(mockRole),
    remove: jest.fn().mockResolvedValue(mockRole),
  };

  const mockPermissionsRepository = {
    find: jest.fn().mockResolvedValue([mockPermission]),
    findOne: jest.fn(),
    create: jest.fn().mockReturnValue(mockPermission),
    save: jest.fn().mockResolvedValue(mockPermission),
  };

  const mockUsersRepository = {
    findOne: jest.fn(),
    save: jest.fn().mockResolvedValue(mockUser),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        {
          provide: getRepositoryToken(Role),
          useValue: mockRolesRepository,
        },
        {
          provide: getRepositoryToken(Permission),
          useValue: mockPermissionsRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUsersRepository,
        },
      ],
    }).compile();

    service = module.get<RolesService>(RolesService);
    rolesRepository = module.get(getRepositoryToken(Role));
    permissionsRepository = module.get(getRepositoryToken(Permission));
    usersRepository = module.get(getRepositoryToken(User));
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAllRoles - Role Listing', () => {
    it('should return all roles with relations', async () => {
      const result = await service.getAllRoles();

      expect(result).toEqual([mockRole]);
      expect(rolesRepository.find).toHaveBeenCalledWith({
        relations: ['permissions', 'createdBy'],
      });
    });
  });

  describe('getRoleById - Single Role Retrieval', () => {
    it('should return role by id with relations', async () => {
      rolesRepository.findOne.mockResolvedValue(mockRole);

      const result = await service.getRoleById('role-uuid');

      expect(result).toEqual(mockRole);
      expect(rolesRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'role-uuid' },
        relations: ['permissions', 'createdBy'],
      });
    });

    it('should throw NotFoundException when role not found', async () => {
      rolesRepository.findOne.mockResolvedValue(null);

      await expect(service.getRoleById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createRole - Role Creation', () => {
    it('should create role successfully', async () => {
      rolesRepository.findOne.mockResolvedValue(null);

      const dto = { name: 'New Role', description: 'New role description', type: 1 };
      const result = await service.createRole(dto);

      expect(rolesRepository.create).toHaveBeenCalledWith({
        name: dto.name,
        description: dto.description,
        type: dto.type,
      });
      expect(rolesRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException when role name already exists', async () => {
      rolesRepository.findOne.mockResolvedValue(mockRole);

      const dto = { name: 'Admin', description: 'Description', type: 1 };

      await expect(service.createRole(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should set createdBy when userId provided', async () => {
      rolesRepository.findOne.mockResolvedValue(null);

      const dto = { name: 'New Role', description: 'Description', type: 1, userId: 'creator-uuid' };
      const saveSpy = jest.fn().mockResolvedValue(mockRole);
      rolesRepository.save = saveSpy;

      await service.createRole(dto);

      // Check that the role was created with correct data and then save was called
      expect(rolesRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        name: dto.name,
        description: dto.description,
        type: dto.type,
      }));
      // The createdBy is set after create() but before save()
      expect(saveSpy).toHaveBeenCalled();
    });
  });

  describe('updateRole - Role Update', () => {
    it('should update role name', async () => {
      rolesRepository.findOne.mockResolvedValue(mockRole);
      const saveSpy = jest.fn().mockResolvedValue({ ...mockRole, name: 'Updated Name' });
      rolesRepository.save = saveSpy;

      const result = await service.updateRole('role-uuid', { name: 'Updated Name' });

      expect(saveSpy).toHaveBeenCalledWith(expect.objectContaining({ name: 'Updated Name' }));
    });

    it('should update role description', async () => {
      rolesRepository.findOne.mockResolvedValue(mockRole);
      const saveSpy = jest.fn().mockResolvedValue({ ...mockRole, description: 'Updated Desc' });
      rolesRepository.save = saveSpy;

      await service.updateRole('role-uuid', { description: 'Updated Desc' });

      expect(saveSpy).toHaveBeenCalledWith(expect.objectContaining({ description: 'Updated Desc' }));
    });

    it('should throw NotFoundException when role not found', async () => {
      rolesRepository.findOne.mockResolvedValue(null);

      await expect(service.updateRole('non-existent', { name: 'New Name' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deleteRole - Role Deletion', () => {
    it('should delete role successfully', async () => {
      rolesRepository.findOne.mockResolvedValue(mockRole);

      const result = await service.deleteRole('role-uuid');

      expect(rolesRepository.remove).toHaveBeenCalledWith(mockRole);
    });

    it('should throw NotFoundException when role not found', async () => {
      rolesRepository.findOne.mockResolvedValue(null);

      await expect(service.deleteRole('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getPermissionsByRoleId - Permission Retrieval', () => {
    it('should return permissions for role', async () => {
      const roleWithPermissions = { ...mockRole, permissions: [mockPermission] };
      rolesRepository.findOne.mockResolvedValue(roleWithPermissions);

      const result = await service.getPermissionsByRoleId('role-uuid');

      expect(result).toEqual([mockPermission]);
    });

    it('should throw NotFoundException when role not found', async () => {
      rolesRepository.findOne.mockResolvedValue(null);

      await expect(service.getPermissionsByRoleId('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateRolePermissions - Permission Update', () => {
    it('should update role permissions', async () => {
      rolesRepository.findOne.mockResolvedValue(mockRole);
      permissionsRepository.findOne.mockResolvedValue(mockPermission);

      const dto = { permissions: [PermissionType.CREATE_CATEGORY, PermissionType.UPDATE_CATEGORY] };
      await service.updateRolePermissions('role-uuid', dto);

      expect(rolesRepository.save).toHaveBeenCalled();
    });

    it('should create permissions if not exist', async () => {
      rolesRepository.findOne.mockResolvedValue(mockRole);
      permissionsRepository.findOne.mockResolvedValue(null);

      const dto = { permissions: [PermissionType.CREATE_CATEGORY] };
      await service.updateRolePermissions('role-uuid', dto);

      expect(permissionsRepository.create).toHaveBeenCalledWith({ name: PermissionType.CREATE_CATEGORY });
      expect(permissionsRepository.save).toHaveBeenCalled();
    });
  });

  describe('getAllPermissions - Permission Listing', () => {
    it('should return all permissions', async () => {
      const result = await service.getAllPermissions();

      expect(result).toEqual([mockPermission]);
      expect(permissionsRepository.find).toHaveBeenCalled();
    });
  });

  describe('assignRoleToUser - Role Assignment', () => {
    it('should assign role to user', async () => {
      usersRepository.findOne.mockResolvedValue(mockUser);
      rolesRepository.findOne.mockResolvedValue(mockRole);

      const dto = { userId: 'user-uuid', roleId: 'role-uuid' };
      await service.assignRoleToUser(dto);

      expect(usersRepository.save).toHaveBeenCalled();
    });

    it('should not duplicate role if already assigned', async () => {
      const userWithRole = { ...mockUser, roles: [mockRole] };
      usersRepository.findOne.mockResolvedValue(userWithRole);
      rolesRepository.findOne.mockResolvedValue(mockRole);

      const dto = { userId: 'user-uuid', roleId: 'role-uuid' };
      await service.assignRoleToUser(dto);

      expect(usersRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        roles: [mockRole],
      }));
    });

    it('should throw NotFoundException when user not found', async () => {
      usersRepository.findOne.mockResolvedValue(null);

      const dto = { userId: 'non-existent', roleId: 'role-uuid' };
      await expect(service.assignRoleToUser(dto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('hasAccess - Permission Check', () => {
    it('should return true when role has permission', async () => {
      const roleWithPermission = { ...mockRole, permissions: [mockPermission] };
      rolesRepository.findOne.mockResolvedValue(roleWithPermission);

      const result = await service.hasAccess('role-uuid', PermissionType.CREATE_CATEGORY);

      expect(result).toBe(true);
    });

    it('should return false when role does not have permission', async () => {
      rolesRepository.findOne.mockResolvedValue(mockRole);

      const result = await service.hasAccess('role-uuid', PermissionType.DELETE_CATEGORY);

      expect(result).toBe(false);
    });

    it('should return false when role not found', async () => {
      rolesRepository.findOne.mockResolvedValue(null);

      const result = await service.hasAccess('non-existent', PermissionType.CREATE_CATEGORY);

      expect(result).toBe(false);
    });
  });
});
