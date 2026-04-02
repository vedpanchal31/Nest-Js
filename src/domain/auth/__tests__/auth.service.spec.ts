import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../../users/entities/user.entity';
import { Profile } from '../../users/entities/profile.entity';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { MailerService } from '@nestjs-modules/mailer';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Queue } from 'bull';
import { getQueueToken } from '@nestjs/bull';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { OtpType, TokenType, UserType } from '../../../core/constants/app.constants';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let usersRepository: jest.Mocked<Repository<User>>;
  let jwtService: jest.Mocked<JwtService>;
  let mailerService: jest.Mocked<MailerService>;
  let cacheManager: { get: jest.Mock; set: jest.Mock; del: jest.Mock };
  let notificationsQueue: jest.Mocked<Queue>;

  const mockUser: User = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Test User',
    email: 'test@example.com',
    password: 'hashedPassword123',
    isEmailVerified: false,
    userType: UserType.USER,
    profile: {} as Profile,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null as unknown as Date,
    roles: [],
    products: [],
  };

  const mockVerifiedUser: User = {
    ...mockUser,
    isEmailVerified: true,
  };

  const mockUserWithRoles: User = {
    ...mockVerifiedUser,
    roles: [{ id: '550e8400-e29b-41d4-a716-446655440001', name: 'USER', description: 'User Role', type: 1, permissions: [], users: [], createdBy: undefined as unknown as User }],
  };

  beforeEach(async () => {
    const usersRepositoryMock = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const jwtServiceMock = {
      signAsync: jest.fn(),
      verifyAsync: jest.fn(),
    };

    const mailerServiceMock = {
      sendMail: jest.fn(),
    };

    const cacheManagerMock = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    const notificationsQueueMock = {
      add: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: usersRepositoryMock,
        },
        {
          provide: JwtService,
          useValue: jwtServiceMock,
        },
        {
          provide: MailerService,
          useValue: mailerServiceMock,
        },
        {
          provide: CACHE_MANAGER,
          useValue: cacheManagerMock,
        },
        {
          provide: getQueueToken('notifications'),
          useValue: notificationsQueueMock,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersRepository = module.get(getRepositoryToken(User));
    jwtService = module.get(JwtService);
    mailerService = module.get(MailerService);
    cacheManager = module.get(CACHE_MANAGER);
    notificationsQueue = module.get(getQueueToken('notifications'));

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    const registerDto = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'Password@123',
      userType: UserType.USER,
    };

    it('should throw BadRequestException when trying to register as Admin', async () => {
      const adminDto = { ...registerDto, userType: UserType.ADMIN };
      await expect(service.register(adminDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when trying to register as SubAdmin', async () => {
      const subAdminDto = { ...registerDto, userType: UserType.SUBADMIN };
      await expect(service.register(subAdminDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when user already exists', async () => {
      usersRepository.findOne.mockResolvedValue(mockUser);
      await expect(service.register(registerDto)).rejects.toThrow(BadRequestException);
      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { email: registerDto.email },
        withDeleted: true,
      });
    });

    it('should successfully register a new user', async () => {
      usersRepository.findOne.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword123');
      usersRepository.create.mockReturnValue(mockUser);
      usersRepository.save.mockResolvedValue(mockUser);

      const result = await service.register(registerDto);

      expect(usersRepository.create).toHaveBeenCalledWith({
        ...registerDto,
        password: 'hashedPassword123',
        name: registerDto.name,
        email: registerDto.email,
        userType: UserType.USER,
        profile: {
          name: registerDto.name,
          email: registerDto.email,
        },
      });
      expect(usersRepository.save).toHaveBeenCalledWith(mockUser);
      expect(cacheManager.set).toHaveBeenCalled();
      expect(mailerService.sendMail).toHaveBeenCalled();
      expect(notificationsQueue.add).toHaveBeenCalledWith('welcome-notification', {
        userId: mockUser.id,
        userName: mockUser.name,
      });
      expect(result).toEqual({
        message: 'Signup successful. Please verify your email with the OTP sent.',
        user: {
          id: mockUser.id,
          name: mockUser.name,
          email: mockUser.email,
          userType: mockUser.userType,
        },
      });
    });

    it('should use USER as default userType when not provided', async () => {
      const dtoWithoutType = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'Password@123',
      };
      usersRepository.findOne.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword123');
      usersRepository.create.mockReturnValue(mockUser);
      usersRepository.save.mockResolvedValue(mockUser);

      await service.register(dtoWithoutType as any);

      expect(usersRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userType: UserType.USER,
        }),
      );
    });
  });

  describe('signin (login)', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'Password@123',
    };

    it('should throw UnauthorizedException when user not found', async () => {
      usersRepository.findOne.mockResolvedValue(null);
      await expect(service.signin(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      usersRepository.findOne.mockResolvedValue(mockVerifiedUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(service.signin(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should send OTP and throw UnauthorizedException when email not verified', async () => {
      usersRepository.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(service.signin(loginDto)).rejects.toThrow(UnauthorizedException);
      expect(cacheManager.set).toHaveBeenCalled();
      expect(mailerService.sendMail).toHaveBeenCalled();
    });

    it('should successfully login verified user and return token', async () => {
      usersRepository.findOne.mockResolvedValue(mockUserWithRoles);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.signAsync.mockResolvedValue('mock-jwt-token');

      const result = await service.signin(loginDto);

      expect(jwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          email: mockUserWithRoles.email,
          id: mockUserWithRoles.id,
          type: TokenType.LOGIN,
          userType: mockUserWithRoles.userType,
          roleId: mockUserWithRoles.roles[0].id,
        }),
        { expiresIn: '7d' },
      );
      expect(result).toEqual({
        message: 'Login Succesful',
        user: {
          token: 'mock-jwt-token',
          id: mockUserWithRoles.id,
          name: mockUserWithRoles.name,
          email: mockUserWithRoles.email,
          userType: mockUserWithRoles.userType,
          roles: [
            {
              id: '550e8400-e29b-41d4-a716-446655440001',
              name: 'USER',
              permissions: [],
            },
          ],
        },
      });
    });

    it('should handle user without roles', async () => {
      usersRepository.findOne.mockResolvedValue(mockVerifiedUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.signAsync.mockResolvedValue('mock-jwt-token');

      const result = await service.signin(loginDto);

      expect(jwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          roleId: undefined,
        }),
        { expiresIn: '7d' },
      );
      expect(result).toBeDefined();
    });
  });

  describe('verifyOtp', () => {
    const verifyOtpDto = {
      email: 'test@example.com',
      otp: '123456',
      otpType: OtpType.EMAIL_VERIFICATION,
    };

    it('should throw BadRequestException when user not found', async () => {
      usersRepository.findOne.mockResolvedValue(null);
      await expect(service.verifyOtp(verifyOtpDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when OTP is invalid', async () => {
      usersRepository.findOne.mockResolvedValue(mockUser);
      cacheManager.get.mockResolvedValue('654321');
      await expect(service.verifyOtp(verifyOtpDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when OTP not found', async () => {
      usersRepository.findOne.mockResolvedValue(mockUser);
      cacheManager.get.mockResolvedValue(null);
      await expect(service.verifyOtp(verifyOtpDto)).rejects.toThrow(BadRequestException);
    });

    it('should successfully verify email OTP', async () => {
      usersRepository.findOne.mockResolvedValue(mockUser);
      cacheManager.get.mockResolvedValue('123456');
      usersRepository.save.mockResolvedValue({ ...mockUser, isEmailVerified: true });

      const result = await service.verifyOtp(verifyOtpDto);

      expect(usersRepository.save).toHaveBeenCalledWith(expect.objectContaining({ isEmailVerified: true }));
      expect(cacheManager.del).toHaveBeenCalledWith(`otp:${verifyOtpDto.email}:${verifyOtpDto.otpType}`);
      expect(result).toEqual({
        message: 'Verification successful',
        isEmailVerified: true,
      });
    });

    it('should successfully verify forgot password OTP and return reset token', async () => {
      const forgotPasswordOtpDto = {
        ...verifyOtpDto,
        otpType: OtpType.FORGOT_PASSWORD,
      };
      usersRepository.findOne.mockResolvedValue(mockUser);
      cacheManager.get.mockResolvedValue('123456');
      jwtService.signAsync.mockResolvedValue('mock-reset-token');

      const result = await service.verifyOtp(forgotPasswordOtpDto);

      expect(jwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          email: mockUser.email,
          id: mockUser.id,
          type: TokenType.RESET_PASSWORD,
          userType: mockUser.userType,
        }),
        { expiresIn: '15m' },
      );
      expect(cacheManager.set).toHaveBeenCalledWith(
        `reset_token:${mockUser.email}`,
        'mock-reset-token',
        900000,
      );
      expect(cacheManager.del).toHaveBeenCalledWith(`otp:${forgotPasswordOtpDto.email}:${forgotPasswordOtpDto.otpType}`);
      expect(result).toEqual({
        message: 'OTP verified. You can now reset your password.',
        resetToken: 'mock-reset-token',
      });
    });
  });

  describe('resendOtp', () => {
    const resendOtpDto = {
      email: 'test@example.com',
      type: OtpType.EMAIL_VERIFICATION,
    };

    it('should throw BadRequestException when user not found', async () => {
      usersRepository.findOne.mockResolvedValue(null);
      await expect(service.resendOtp(resendOtpDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when user already verified for email verification type', async () => {
      usersRepository.findOne.mockResolvedValue(mockVerifiedUser);
      const emailVerifyDto = { ...resendOtpDto, type: OtpType.EMAIL_VERIFICATION };
      await expect(service.resendOtp(emailVerifyDto)).rejects.toThrow(BadRequestException);
    });

    it('should successfully resend email verification OTP', async () => {
      const unverifiedUser = { ...mockUser, isEmailVerified: false };
      usersRepository.findOne.mockResolvedValue(unverifiedUser);

      const result = await service.resendOtp(resendOtpDto);

      expect(cacheManager.set).toHaveBeenCalledWith(
        `otp:${resendOtpDto.email}:${resendOtpDto.type}`,
        expect.any(String),
        600000,
      );
      expect(mailerService.sendMail).toHaveBeenCalled();
      expect(result).toEqual({ message: 'OTP sent successfully' });
    });

    it('should successfully resend forgot password OTP', async () => {
      usersRepository.findOne.mockResolvedValue(mockVerifiedUser);
      const forgotPasswordDto = { ...resendOtpDto, type: OtpType.FORGOT_PASSWORD };

      const result = await service.resendOtp(forgotPasswordDto);

      expect(cacheManager.set).toHaveBeenCalled();
      expect(mailerService.sendMail).toHaveBeenCalled();
      expect(result).toEqual({ message: 'OTP sent successfully' });
    });
  });

  describe('forgotPassword', () => {
    const forgotPasswordDto = {
      email: 'test@example.com',
    };

    it('should throw BadRequestException when user not found', async () => {
      usersRepository.findOne.mockResolvedValue(null);
      await expect(service.forgotPassword(forgotPasswordDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw UnauthorizedException when user email is not verified', async () => {
      const unverifiedUser = { ...mockUser, isEmailVerified: false };
      usersRepository.findOne.mockResolvedValue(unverifiedUser);
      await expect(service.forgotPassword(forgotPasswordDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should successfully send forgot password OTP', async () => {
      usersRepository.findOne.mockResolvedValue(mockVerifiedUser);

      const result = await service.forgotPassword(forgotPasswordDto);

      expect(cacheManager.set).toHaveBeenCalledWith(
        `otp:${forgotPasswordDto.email}:${OtpType.FORGOT_PASSWORD}`,
        expect.any(String),
        600000,
      );
      expect(mailerService.sendMail).toHaveBeenCalledWith(expect.objectContaining({
        to: forgotPasswordDto.email,
        subject: 'Reset Your Password',
      }));
      expect(result).toEqual({ message: 'OTP sent successfully' });
    });
  });

  describe('resetPassword', () => {
    const resetPasswordDto = {
      resetToken: 'mock-reset-token',
      email: 'test@example.com',
      password: 'NewPassword@123',
      confirmPassword: 'NewPassword@123',
    };

    it('should throw BadRequestException when passwords do not match', async () => {
      const mismatchedDto = { ...resetPasswordDto, confirmPassword: 'DifferentPassword@123' };
      await expect(service.resetPassword(mismatchedDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when reset token is invalid', async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));
      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when token email does not match', async () => {
      jwtService.verifyAsync.mockResolvedValue({
        email: 'different@example.com',
        type: TokenType.RESET_PASSWORD,
      });
      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when token type is not RESET_PASSWORD', async () => {
      jwtService.verifyAsync.mockResolvedValue({
        email: resetPasswordDto.email,
        type: TokenType.LOGIN,
      });
      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when user not found', async () => {
      jwtService.verifyAsync.mockResolvedValue({
        email: resetPasswordDto.email,
        type: TokenType.RESET_PASSWORD,
      });
      usersRepository.findOne.mockResolvedValue(null);
      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when reset token not found in cache', async () => {
      jwtService.verifyAsync.mockResolvedValue({
        email: resetPasswordDto.email,
        type: TokenType.RESET_PASSWORD,
      });
      usersRepository.findOne.mockResolvedValue(mockVerifiedUser);
      cacheManager.get.mockResolvedValue(null);
      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when reset token does not match cached token', async () => {
      jwtService.verifyAsync.mockResolvedValue({
        email: resetPasswordDto.email,
        type: TokenType.RESET_PASSWORD,
      });
      usersRepository.findOne.mockResolvedValue(mockVerifiedUser);
      cacheManager.get.mockResolvedValue('different-token');
      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when new password is same as old password', async () => {
      jwtService.verifyAsync.mockResolvedValue({
        email: resetPasswordDto.email,
        type: TokenType.RESET_PASSWORD,
      });
      usersRepository.findOne.mockResolvedValue(mockVerifiedUser);
      cacheManager.get.mockResolvedValue(resetPasswordDto.resetToken);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(BadRequestException);
    });

    it('should successfully reset password', async () => {
      jwtService.verifyAsync.mockResolvedValue({
        email: resetPasswordDto.email,
        type: TokenType.RESET_PASSWORD,
      });
      usersRepository.findOne.mockResolvedValue(mockVerifiedUser);
      cacheManager.get.mockResolvedValue(resetPasswordDto.resetToken);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      (bcrypt.hash as jest.Mock).mockResolvedValue('newHashedPassword');
      usersRepository.save.mockResolvedValue({ ...mockVerifiedUser, password: 'newHashedPassword' });

      const result = await service.resetPassword(resetPasswordDto);

      expect(bcrypt.hash).toHaveBeenCalledWith(resetPasswordDto.password, 10);
      expect(usersRepository.save).toHaveBeenCalled();
      expect(cacheManager.del).toHaveBeenCalledWith(`reset_token:${resetPasswordDto.email}`);
      expect(notificationsQueue.add).toHaveBeenCalledWith('send-notification', {
        userId: mockVerifiedUser.id,
        type: expect.any(String),
        title: 'Password Changed Successfully',
        message: expect.any(String),
        actionUrl: '/settings/security',
        eventName: 'user.password-changed',
      });
      expect(result).toEqual({
        message: 'Password reset successfully. You can now login with your new password.',
      });
    });
  });

  describe('validate', () => {
    it('should return payload when token is valid', async () => {
      const mockPayload = { email: 'test@example.com', id: 'user-id', type: TokenType.LOGIN, userType: UserType.USER };
      jwtService.verifyAsync.mockResolvedValue(mockPayload);

      const result = await service.validate('valid-token');

      expect(result).toEqual(mockPayload);
    });

    it('should return null when token is invalid', async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      const result = await service.validate('invalid-token');

      expect(result).toBeNull();
    });
  });
});
