/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, CanActivate, NotFoundException } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { UserType } from '../src/core/constants/app.constants';
import { UserManagementController } from '../src/domain/users/user-management.controller';
import { UsersService } from '../src/domain/users/users.service';
import { AuthGuard } from '../src/core/guards/auth.guard';
import { RoleGuard } from '../src/core/guards/role.guard';

describe('UserManagementController (e2e)', () => {
  let app: INestApplication<App>;

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
      countryCode: '+1',
      countryShortcode: 'US',
      mobile: '1234567890',
      address: '123 Main St, New York, NY',
    },
    roles: [{ id: 'role-id', name: 'ADMIN' }],
    products: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: undefined,
  };

  const mockUsersService = {
    getAllUsers: jest.fn().mockResolvedValue({
      users: [mockUser],
      total: 1,
      page: 1,
      limit: 10,
    }),
    findOne: jest.fn().mockResolvedValue(mockUser),
    createUser: jest.fn().mockResolvedValue(mockUser),
    updateUser: jest.fn().mockResolvedValue({
      ...mockUser,
      name: 'Updated Name',
    }),
    removeUser: jest.fn().mockResolvedValue(mockUser),
  };

  const mockAuthGuard: CanActivate = {
    canActivate: jest.fn().mockImplementation((context) => {
      const req = context.switchToHttp().getRequest();
      req.user = {
        id: 'admin-id',
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
      controllers: [UserManagementController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
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

  describe('GET /user-management', () => {
    it('should return paginated users list', async () => {
      const response = await request(app.getHttpServer())
        .get('/user-management?page=1&limit=10')
        .set('Authorization', 'Bearer mock-jwt-token')
        .expect(200);

      expect(response.body.users).toBeDefined();
      expect(response.body.total).toBe(1);
    });

    it('should apply search filter', async () => {
      const response = await request(app.getHttpServer())
        .get('/user-management?page=1&limit=10&search=test')
        .set('Authorization', 'Bearer mock-jwt-token')
        .expect(200);

      expect(response.body.users).toBeDefined();
    });

    it('should filter by userType', async () => {
      const response = await request(app.getHttpServer())
        .get('/user-management?page=1&limit=10&userType=2')
        .set('Authorization', 'Bearer mock-jwt-token')
        .expect(200);

      expect(mockUsersService.getAllUsers).toHaveBeenCalledWith(1, 10, undefined, "2");
    });
  });

  describe('POST /user-management', () => {
    it('should create a managed user successfully', async () => {
      const createDto = {
        name: 'New SubAdmin',
        email: 'newsubadmin@example.com',
        userType: 4, // UserType.SUBADMIN
        roleId: '550e8400-e29b-41d4-a716-446655440999',
      };

      const response = await request(app.getHttpServer())
        .post('/user-management')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send(createDto)
        .expect(201);

      expect(response.body.email).toBe('test@example.com');
      expect(mockUsersService.createUser).toHaveBeenCalledWith(createDto);
    });

    it('should return 400 for invalid email', async () => {
      await request(app.getHttpServer())
        .post('/user-management')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send({
          name: 'New User',
          email: 'invalid-email',
          userType: 4, // UserType.SUBADMIN
        })
        .expect(400);
    });

    it('should return 400 for missing name', async () => {
      await request(app.getHttpServer())
        .post('/user-management')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send({
          email: 'test@example.com',
          userType: 4, // UserType.SUBADMIN
        })
        .expect(400);
    });

    it('should return 400 for invalid userType', async () => {
      await request(app.getHttpServer())
        .post('/user-management')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send({
          name: 'New User',
          email: 'test@example.com',
          userType: 'invalid',
        })
        .expect(400);
    });
  });

  describe('GET /user-management/:id', () => {
    it('should return user by id', async () => {
      const response = await request(app.getHttpServer())
        .get(`/user-management/${mockUser.id}`)
        .set('Authorization', 'Bearer mock-jwt-token')
        .expect(200);

      expect(response.body.id).toBe(mockUser.id);
      expect(mockUsersService.findOne).toHaveBeenCalledWith(mockUser.id);
    });

    it('should return 404 when user not found', async () => {
      mockUsersService.findOne.mockRejectedValue(new NotFoundException('User not found'));

      await request(app.getHttpServer())
        .get('/user-management/non-existent-id')
        .set('Authorization', 'Bearer mock-jwt-token')
        .expect(404);
    });
  });

  describe('PATCH /user-management/:id', () => {
    it('should update user successfully', async () => {
      const updateDto = {
        name: 'Updated Name',
        userType: 2, // UserType.ADMIN
      };

      const response = await request(app.getHttpServer())
        .patch(`/user-management/${mockUser.id}`)
        .set('Authorization', 'Bearer mock-jwt-token')
        .send(updateDto)
        .expect(200);

      expect(response.body.name).toBe('Updated Name');
      expect(mockUsersService.updateUser).toHaveBeenCalledWith(mockUser.id, updateDto);
    });

    it('should return 400 for invalid email', async () => {
      await request(app.getHttpServer())
        .patch(`/user-management/${mockUser.id}`)
        .set('Authorization', 'Bearer mock-jwt-token')
        .send({ email: 'invalid-email' })
        .expect(400);
    });

    it('should return 400 for short password', async () => {
      await request(app.getHttpServer())
        .patch(`/user-management/${mockUser.id}`)
        .set('Authorization', 'Bearer mock-jwt-token')
        .send({ password: '123' })
        .expect(400);
    });

    it('should return 404 when user not found', async () => {
      mockUsersService.updateUser.mockRejectedValue(new NotFoundException('User not found'));

      await request(app.getHttpServer())
        .patch('/user-management/non-existent-id')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send({ name: 'Updated Name' })
        .expect(404);
    });
  });

  describe('DELETE /user-management/:id', () => {
    it('should soft delete user successfully', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/user-management/${mockUser.id}`)
        .set('Authorization', 'Bearer mock-jwt-token')
        .expect(200);

      expect(mockUsersService.removeUser).toHaveBeenCalledWith(mockUser.id);
    });

    it('should return 404 when user not found', async () => {
      mockUsersService.removeUser.mockRejectedValue(new NotFoundException('User not found'));

      await request(app.getHttpServer())
        .delete('/user-management/non-existent-id')
        .set('Authorization', 'Bearer mock-jwt-token')
        .expect(404);
    });
  });
});
