/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../src/domain/users/entities/user.entity';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { JwtService } from '@nestjs/jwt';
import { MailerService } from '@nestjs-modules/mailer';
import { getQueueToken } from '@nestjs/bull';
import { OtpType, UserType } from '../src/core/constants/app.constants';
import { AuthController } from '../src/domain/auth/auth.controller';
import { AuthService } from '../src/domain/auth/auth.service';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashedPassword123'),
  compare: jest.fn().mockResolvedValue(true),
}));

describe('AuthController (e2e)', () => {
  let app: INestApplication<App>;

  const mockUser = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Test User',
    email: 'test@example.com',
    password: 'hashedPassword123',
    isEmailVerified: false,
    userType: UserType.USER,
    profile: undefined,
    deletedAt: null,
    roles: [],
    products: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockVerifiedUser = {
    ...mockUser,
    isEmailVerified: true,
  };

  const mockUsersRepository = {
    findOne: jest.fn(),
    create: jest.fn().mockReturnValue(mockUser),
    save: jest.fn().mockResolvedValue(mockUser),
  };

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
  };

  const mockNotificationsQueue = {
    add: jest.fn().mockResolvedValue(undefined),
  };

  const mockJwtService = {
    signAsync: jest.fn().mockResolvedValue('mock-jwt-token'),
    verifyAsync: jest.fn().mockResolvedValue({
      email: 'test@example.com',
      type: 3,
    }),
  };

  const mockMailerService = {
    sendMail: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUsersRepository,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
        {
          provide: getQueueToken('notifications'),
          useValue: mockNotificationsQueue,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: MailerService,
          useValue: mockMailerService,
        },
      ],
    }).compile();

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

  describe('POST /auth/register', () => {
    it('should successfully register a new user', async () => {
      mockUsersRepository.findOne.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          password: 'Password@123',
        })
        .expect(201);

      expect(response.body.message).toContain('verify your email');
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe('test@example.com');
    });

    it('should return 400 when user already exists', async () => {
      mockUsersRepository.findOne.mockResolvedValue(mockUser);

      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          password: 'Password@123',
        })
        .expect(400);
    });

    it('should return 400 for invalid email format', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          name: 'Test User',
          email: 'invalid-email',
          password: 'Password@123',
        })
        .expect(400);
    });

    it('should return 400 for weak password', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          password: 'weak',
        })
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    it('should return 401 when user not found', async () => {
      mockUsersRepository.findOne.mockResolvedValue(null);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Password@123',
        })
        .expect(401);
    });

    it('should return 401 for unverified email with OTP sent', async () => {
      mockUsersRepository.findOne.mockResolvedValue(mockUser);

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password@123',
        })
        .expect(401);

      expect(response.body.message).toContain('not verified');
    });
  });

  describe('POST /auth/verify-otp', () => {
    it('should verify email OTP successfully', async () => {
      mockUsersRepository.findOne.mockResolvedValue(mockUser);
      mockCacheManager.get.mockResolvedValue('123456');
      mockUsersRepository.save.mockResolvedValue({ ...mockUser, isEmailVerified: true });

      const response = await request(app.getHttpServer())
        .post('/auth/verify-otp')
        .send({
          email: 'test@example.com',
          otp: '123456',
          otpType: OtpType.EMAIL_VERIFICATION,
        })
        .expect(201);

      expect(response.body.message).toContain('Verification successful');
      expect(response.body.isEmailVerified).toBe(true);
    });

    it('should return 400 for invalid OTP', async () => {
      mockUsersRepository.findOne.mockResolvedValue(mockUser);
      mockCacheManager.get.mockResolvedValue('654321');

      await request(app.getHttpServer())
        .post('/auth/verify-otp')
        .send({
          email: 'test@example.com',
          otp: '123456',
          otpType: OtpType.EMAIL_VERIFICATION,
        })
        .expect(400);
    });

    it('should return 400 when user not found', async () => {
      mockUsersRepository.findOne.mockResolvedValue(null);

      await request(app.getHttpServer())
        .post('/auth/verify-otp')
        .send({
          email: 'nonexistent@example.com',
          otp: '123456',
          otpType: OtpType.EMAIL_VERIFICATION,
        })
        .expect(400);
    });

    it('should return 400 for invalid OTP format', async () => {
      await request(app.getHttpServer())
        .post('/auth/verify-otp')
        .send({
          email: 'test@example.com',
          otp: '12345',
          otpType: OtpType.EMAIL_VERIFICATION,
        })
        .expect(400);
    });
  });

  describe('POST /auth/resend-otp', () => {
    it('should resend OTP successfully', async () => {
      const unverifiedUser = { ...mockUser, isEmailVerified: false };
      mockUsersRepository.findOne.mockResolvedValue(unverifiedUser);

      const response = await request(app.getHttpServer())
        .post('/auth/resend-otp')
        .send({
          email: 'test@example.com',
          type: OtpType.EMAIL_VERIFICATION,
        })
        .expect(201);

      expect(response.body.message).toContain('OTP sent');
    });

    it('should return 400 when user not found', async () => {
      mockUsersRepository.findOne.mockResolvedValue(null);

      await request(app.getHttpServer())
        .post('/auth/resend-otp')
        .send({
          email: 'nonexistent@example.com',
          type: OtpType.EMAIL_VERIFICATION,
        })
        .expect(400);
    });

    it('should return 400 when user already verified', async () => {
      mockUsersRepository.findOne.mockResolvedValue(mockVerifiedUser);

      await request(app.getHttpServer())
        .post('/auth/resend-otp')
        .send({
          email: 'test@example.com',
          type: OtpType.EMAIL_VERIFICATION,
        })
        .expect(400);
    });
  });

  describe('POST /auth/forgot-password', () => {
    it('should initiate forgot password flow', async () => {
      mockUsersRepository.findOne.mockResolvedValue(mockVerifiedUser);

      const response = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({
          email: 'test@example.com',
        })
        .expect(201);

      expect(response.body.message).toContain('OTP sent');
    });

    it('should return 400 when user not found', async () => {
      mockUsersRepository.findOne.mockResolvedValue(null);

      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({
          email: 'nonexistent@example.com',
        })
        .expect(400);
    });

    it('should return 401 when user email not verified', async () => {
      const unverifiedUser = { ...mockUser, isEmailVerified: false };
      mockUsersRepository.findOne.mockResolvedValue(unverifiedUser);

      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({
          email: 'test@example.com',
        })
        .expect(401);
    });
  });

  describe('POST /auth/reset-password', () => {
    it('should reset password successfully', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      mockJwtService.verifyAsync.mockResolvedValue({
        email: 'test@example.com',
        type: 3, // TokenType.RESET_PASSWORD
      });
      mockUsersRepository.findOne.mockResolvedValue(mockVerifiedUser);
      mockCacheManager.get.mockResolvedValue('mock-reset-token');
      mockUsersRepository.save.mockResolvedValue({
        ...mockVerifiedUser,
        password: 'newHashedPassword',
      });

      const response = await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          resetToken: 'mock-reset-token',
          email: 'test@example.com',
          password: 'NewPassword@123',
          confirmPassword: 'NewPassword@123',
        })
        .expect(201);

      expect(response.body.message).toContain('Password reset successfully');
    });

    it('should return 400 when passwords do not match', async () => {
      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          resetToken: 'mock-reset-token',
          email: 'test@example.com',
          password: 'NewPassword@123',
          confirmPassword: 'DifferentPassword@123',
        })
        .expect(400);
    });

    it('should return 400 for weak password', async () => {
      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          resetToken: 'mock-reset-token',
          email: 'test@example.com',
          password: '123',
          confirmPassword: '123',
        })
        .expect(400);
    });
  });
});
