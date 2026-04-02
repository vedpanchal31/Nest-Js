/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, CanActivate } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { UserType, PermissionType } from '../src/core/constants/app.constants';
import { RolesController, PermissionsController } from '../src/domain/roles/roles.controller';
import { RolesService } from '../src/domain/roles/roles.service';
import { AuthGuard } from '../src/core/guards/auth.guard';
import { RoleGuard } from '../src/core/guards/role.guard';

describe('RolesController (e2e)', () => {
  let app: INestApplication<App>;

  const mockRole = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    name: 'Admin',
    description: 'Administrator role',
    type: 1,
    permissions: [{ id: 'perm-uuid', name: 'CREATE_CATEGORY' }],
    createdBy: { id: 'user-uuid', email: 'admin@example.com' },
  };

  const mockRolesService = {
    getAllRoles: jest.fn().mockResolvedValue([mockRole]),
    getRoleById: jest.fn().mockResolvedValue(mockRole),
    createRole: jest.fn().mockResolvedValue(mockRole),
    updateRole: jest.fn().mockResolvedValue({ ...mockRole, name: 'Updated Role' }),
    deleteRole: jest.fn().mockResolvedValue(mockRole),
    getPermissionsByRoleId: jest.fn().mockResolvedValue([{ id: 'perm-uuid', name: 'CREATE_CATEGORY' }]),
    updateRolePermissions: jest.fn().mockResolvedValue({ ...mockRole, permissions: [] }),
    assignRoleToUser: jest.fn().mockResolvedValue({ id: 'user-uuid', roles: [mockRole] }),
    getAllPermissions: jest.fn().mockResolvedValue([{ id: 'perm-uuid', name: 'CREATE_CATEGORY' }]),
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
      controllers: [RolesController, PermissionsController],
      providers: [
        {
          provide: RolesService,
          useValue: mockRolesService,
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

  describe('GET /roles', () => {
    it('should return all roles (admin)', async () => {
      const response = await request(app.getHttpServer())
        .get('/roles')
        .set('Authorization', 'Bearer mock-jwt-token')
        .expect(200);

      expect(response.body).toEqual([mockRole]);
    });
  });

  describe('POST /roles', () => {
    it('should create role successfully (admin)', async () => {
      const createDto = {
        name: 'New Role',
        description: 'New role description',
        type: 1,
      };

      const response = await request(app.getHttpServer())
        .post('/roles')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send(createDto)
        .expect(201);

      expect(response.body).toEqual(mockRole);
    });

    it('should return 400 when name is missing', async () => {
      await request(app.getHttpServer())
        .post('/roles')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send({
          description: 'Description',
          type: 1,
        })
        .expect(400);
    });

    it('should return 400 when type is missing', async () => {
      await request(app.getHttpServer())
        .post('/roles')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send({
          name: 'New Role',
          description: 'Description',
        })
        .expect(400);
    });
  });

  describe('PATCH /roles/:id', () => {
    it('should update role successfully (admin)', async () => {
      const updateDto = { name: 'Updated Role' };

      const response = await request(app.getHttpServer())
        .patch(`/roles/${mockRole.id}`)
        .set('Authorization', 'Bearer mock-jwt-token')
        .send(updateDto)
        .expect(200);

      expect(response.body.name).toBe('Updated Role');
    });
  });

  describe('DELETE /roles/:id', () => {
    it('should delete role successfully (admin)', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/roles/${mockRole.id}`)
        .set('Authorization', 'Bearer mock-jwt-token')
        .expect(200);

      expect(response.body).toEqual(mockRole);
    });
  });

  describe('PUT /roles/assign-role', () => {
    it('should assign role to user (admin)', async () => {
      const assignDto = {
        userId: '550e8400-e29b-41d4-a716-446655440002',
        roleId: '550e8400-e29b-41d4-a716-446655440001',
      };

      const response = await request(app.getHttpServer())
        .put('/roles/assign-role')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send(assignDto)
        .expect(200);

      expect(response.body.roles).toBeDefined();
    });

    it('should return 400 for invalid userId format', async () => {
      await request(app.getHttpServer())
        .put('/roles/assign-role')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send({
          userId: 'invalid-uuid',
          roleId: '550e8400-e29b-41d4-a716-446655440001',
        })
        .expect(400);
    });
  });

  describe('GET /roles/permissions/:id', () => {
    it('should return permissions for role (admin)', async () => {
      const response = await request(app.getHttpServer())
        .get(`/roles/permissions/${mockRole.id}`)
        .set('Authorization', 'Bearer mock-jwt-token')
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
    });
  });

  describe('PATCH /roles/permissions/:id', () => {
    it('should update role permissions (admin)', async () => {
      const permissionsDto = {
        permissions: [PermissionType.CREATE_CATEGORY, PermissionType.UPDATE_CATEGORY],
      };

      const response = await request(app.getHttpServer())
        .patch(`/roles/permissions/${mockRole.id}`)
        .set('Authorization', 'Bearer mock-jwt-token')
        .send(permissionsDto)
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should return 400 for invalid permission type', async () => {
      await request(app.getHttpServer())
        .patch(`/roles/permissions/${mockRole.id}`)
        .set('Authorization', 'Bearer mock-jwt-token')
        .send({
          permissions: ['INVALID_PERMISSION'],
        })
        .expect(400);
    });
  });

  describe('GET /permissions', () => {
    it('should return all permissions (admin)', async () => {
      const response = await request(app.getHttpServer())
        .get('/permissions')
        .set('Authorization', 'Bearer mock-jwt-token')
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
    });
  });
});
