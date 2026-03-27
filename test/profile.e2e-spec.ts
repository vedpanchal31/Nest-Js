/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, CanActivate, NotFoundException } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { UserType } from '../src/core/constants/app.constants';
import { UsersController } from '../src/domain/users/users.controller';
import { UsersService } from '../src/domain/users/users.service';
import { AuthGuard } from '../src/core/guards/auth.guard';
import { RoleGuard } from '../src/core/guards/role.guard';

describe('ProfileController (e2e)', () => {
  let app: INestApplication<App>;

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
      address: '123 Main St, New York, NY',
    },
    roles: [],
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
    updateProfile: jest.fn().mockResolvedValue({
      ...mockUser,
      name: 'Updated Name',
      profile: {
        ...mockUser.profile,
        name: 'Updated Name',
        address: '456 New Address, Boston, MA',
      },
    }),
    removeUser: jest.fn().mockResolvedValue(mockUser),
  };

  const mockAuthGuard: CanActivate = {
    canActivate: jest.fn().mockImplementation((context) => {
      const req = context.switchToHttp().getRequest();
      req.user = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'test@example.com',
        type: 2,
        userType: UserType.USER,
      };
      return true;
    }),
  };

  const mockRoleGuard: CanActivate = {
    canActivate: jest.fn().mockReturnValue(true),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
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

  describe('GET /users/profile', () => {
    it('should return user profile', async () => {
      mockUsersService.findOne.mockResolvedValue(mockUser);

      const response = await request(app.getHttpServer())
        .get('/users/profile')
        .set('Authorization', 'Bearer mock-jwt-token')
        .expect(200);

      expect(response.body.profile).toBeDefined();
      expect(response.body.email).toBe('test@example.com');
    });

    it('should return 404 when user not found', async () => {
      mockUsersService.findOne.mockRejectedValue(new NotFoundException('User not found'));

      await request(app.getHttpServer())
        .get('/users/profile')
        .set('Authorization', 'Bearer mock-jwt-token')
        .expect(404);
    });
  });

  describe('PUT /users/profile', () => {
    it('should update user profile successfully', async () => {
      const updatedUser = {
        ...mockUser,
        name: 'Updated Name',
        profile: {
          ...mockUser.profile,
          name: 'Updated Name',
          address: '456 New Address, Boston, MA',
        },
      };
      mockUsersService.updateProfile.mockResolvedValue(updatedUser);

      const response = await request(app.getHttpServer())
        .put('/users/profile')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send({
          name: 'Updated Name',
          address: '456 New Address, Boston, MA',
          mobile: '9876543210',
          countryCode: '+44',
          countryShortcode: 'GB',
        })
        .expect(200);

      expect(response.body.name).toBe('Updated Name');
    });

    it('should return 400 for invalid date format', async () => {
      await request(app.getHttpServer())
        .put('/users/profile')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send({
          name: 'Updated Name',
          dateOfBirth: 'invalid-date',
        })
        .expect(400);
    });

    it('should return 400 for short address', async () => {
      await request(app.getHttpServer())
        .put('/users/profile')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send({
          name: 'Updated Name',
          address: 'Short',
        })
        .expect(400);
    });
  });

  describe('DELETE /users/profile', () => {
    it('should soft delete user account', async () => {
      mockUsersService.removeUser.mockResolvedValue(mockUser);

      const response = await request(app.getHttpServer())
        .delete('/users/profile')
        .set('Authorization', 'Bearer mock-jwt-token')
        .expect(200);

      expect(mockUsersService.removeUser).toHaveBeenCalled();
    });
  });

  describe('GET /users (Admin only)', () => {
    it('should return paginated users list', async () => {
      const response = await request(app.getHttpServer())
        .get('/users?page=1&limit=10')
        .set('Authorization', 'Bearer mock-jwt-token')
        .expect(200);

      expect(response.body.users).toBeDefined();
      expect(response.body.total).toBe(1);
    });

    it('should apply search filter', async () => {
      const response = await request(app.getHttpServer())
        .get('/users?page=1&limit=10&search=test')
        .set('Authorization', 'Bearer mock-jwt-token')
        .expect(200);

      expect(response.body.users).toBeDefined();
    });
  });
});
