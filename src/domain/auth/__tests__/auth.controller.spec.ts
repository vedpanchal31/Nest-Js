import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../auth.controller';
import { AuthService } from '../auth.service';
import { UserType, OtpType } from '../../../core/constants/app.constants';

describe('AuthController', () => {
  let controller: AuthController;
  let service: jest.Mocked<AuthService>;

  const mockAuthService = {
    register: jest.fn(),
    signin: jest.fn(),
    verifyOtp: jest.fn(),
    resendOtp: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get(AuthService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    const registerDto = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'Password@123',
      userType: UserType.USER,
    };

    const mockRegisterResponse = {
      message: 'Signup successful. Please verify your email with the OTP sent.',
      user: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test User',
        email: 'test@example.com',
        userType: UserType.USER,
      },
    };

    it('should call authService.register with registerDto', async () => {
      service.register.mockResolvedValue(mockRegisterResponse);

      const result = await controller.register(registerDto);

      expect(service.register).toHaveBeenCalledWith(registerDto);
      expect(result).toEqual(mockRegisterResponse);
    });

    it('should return user data on successful registration', async () => {
      service.register.mockResolvedValue(mockRegisterResponse);

      const result = await controller.register(registerDto);

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(registerDto.email);
      expect(result.message).toContain('verify your email');
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'Password@123',
    };

    const mockLoginResponse = {
      message: 'Login Succesful',
      user: {
        token: 'mock-jwt-token',
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test User',
        email: 'test@example.com',
        userType: UserType.USER,
      },
    };

    it('should call authService.signin with loginDto', async () => {
      service.signin.mockResolvedValue(mockLoginResponse);

      const result = await controller.login(loginDto);

      expect(service.signin).toHaveBeenCalledWith(loginDto);
      expect(result).toEqual(mockLoginResponse);
    });

    it('should return token on successful login', async () => {
      service.signin.mockResolvedValue(mockLoginResponse);

      const result = await controller.login(loginDto);

      expect(result.user.token).toBe('mock-jwt-token');
      expect(result.message).toBe('Login Succesful');
    });
  });

  describe('verifyOtp', () => {
    const verifyOtpDto = {
      email: 'test@example.com',
      otp: '123456',
      otpType: OtpType.EMAIL_VERIFICATION,
    };

    it('should verify email OTP successfully', async () => {
      const mockResponse = {
        message: 'Verification successful',
        isEmailVerified: true,
      };
      service.verifyOtp.mockResolvedValue(mockResponse);

      const result = await controller.verifyOtp(verifyOtpDto);

      expect(service.verifyOtp).toHaveBeenCalledWith(verifyOtpDto);
      expect(result).toEqual(mockResponse);
    });

    it('should return reset token for forgot password OTP', async () => {
      const forgotPasswordOtpDto = {
        ...verifyOtpDto,
        otpType: OtpType.FORGOT_PASSWORD,
      };
      const mockResponse = {
        message: 'OTP verified. You can now reset your password.',
        resetToken: 'mock-reset-token',
      };
      service.verifyOtp.mockResolvedValue(mockResponse);

      const result = await controller.verifyOtp(forgotPasswordOtpDto);

      expect(result!.resetToken).toBe('mock-reset-token');
    });
  });

  describe('resendOtp', () => {
    const resendOtpDto = {
      email: 'test@example.com',
      type: OtpType.EMAIL_VERIFICATION,
    };

    it('should resend OTP successfully', async () => {
      const mockResponse = { message: 'OTP sent successfully' };
      service.resendOtp.mockResolvedValue(mockResponse);

      const result = await controller.resendOtp(resendOtpDto);

      expect(service.resendOtp).toHaveBeenCalledWith(resendOtpDto);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('forgotPassword', () => {
    const forgotPasswordDto = {
      email: 'test@example.com',
    };

    it('should initiate forgot password flow', async () => {
      const mockResponse = { message: 'OTP sent successfully' };
      service.forgotPassword.mockResolvedValue(mockResponse);

      const result = await controller.forgotPassword(forgotPasswordDto);

      expect(service.forgotPassword).toHaveBeenCalledWith(forgotPasswordDto);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('resetPassword', () => {
    const resetPasswordDto = {
      resetToken: 'mock-reset-token',
      email: 'test@example.com',
      password: 'NewPassword@123',
      confirmPassword: 'NewPassword@123',
    };

    it('should reset password successfully', async () => {
      const mockResponse = {
        message:
          'Password reset successfully. You can now login with your new password.',
      };
      service.resetPassword.mockResolvedValue(mockResponse);

      const result = await controller.resetPassword(resetPasswordDto);

      expect(service.resetPassword).toHaveBeenCalledWith(resetPasswordDto);
      expect(result).toEqual(mockResponse);
    });
  });
});
