import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { RegisterDto } from '../../domain/auth/dtos/register.dto';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { LoginDto } from './dtos/login.dto';
import { OtpType, TokenType, UserType } from 'src/core/constants/app.constants';
import { ITokenPayload } from 'src/core/constants/interfaces/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { MailerService } from '@nestjs-modules/mailer';
import { VerifyOtpDto } from './dtos/verify-otp.dto';
import { ResendOtpDto } from './dtos/resend-otp.dto';
import { ForgotPasswordDto } from './dtos/forgot-password.dto';
import { ResetPasswordDto } from './dtos/reset-password.dto';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly _jwt: JwtService,
    private readonly mailerService: MailerService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  private _generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private async _sendOtpEmail(email: string, otp: string, type: OtpType) {
    const subject =
      type === OtpType.EMAIL_VERIFICATION
        ? 'Verify Your Email'
        : 'Reset Your Password';
    await this.mailerService.sendMail({
      to: email,
      subject: subject,
      text: `Your OTP is: ${otp}. It expires in 10 minutes.`,
    });
  }

  private async _signToken(
    payload: ITokenPayload,
    expiresIn: JwtSignOptions['expiresIn'],
  ): Promise<string> {
    return await this._jwt.signAsync(payload, {
      expiresIn,
    });
  }

  async resetPassword(resetPassword: ResetPasswordDto) {
    const { resetToken, email, password, confirmPassword } = resetPassword;

    if (password !== confirmPassword) {
      throw new BadRequestException(
        'Password and confirm password do not match',
      );
    }

    let decoded: ITokenPayload;
    try {
      decoded = await this._jwt.verifyAsync<ITokenPayload>(resetToken);
    } catch {
      throw new BadRequestException('Invalid or expired reset token');
    }

    if (decoded.email !== email || decoded.type !== TokenType.RESET_PASSWORD) {
      throw new BadRequestException(
        'This token is not valid for this email or operation',
      );
    }

    const user = await this.usersRepository.findOne({ where: { email } });
    if (!user) {
      throw new BadRequestException('User with this email does not exist');
    }

    // Check Reset Token in Redis
    const storedResetToken = await this.cacheManager.get<string>(
      `reset_token:${email}`,
    );
    if (!storedResetToken || storedResetToken !== resetToken) {
      throw new BadRequestException(
        'This reset token is invalid or has already been used.',
      );
    }

    const isSamePassword = await bcrypt.compare(password, user.password);
    if (isSamePassword) {
      throw new BadRequestException(
        'New password cannot be the same as your old password. Please choose a different one.',
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;

    await this.usersRepository.save(user);

    // Clear Reset Token from Redis after success
    await this.cacheManager.del(`reset_token:${email}`);

    return {
      message:
        'Password reset successfully. You can now login with your new password.',
    };
  }

  async forgotPassword(forgotPassword: ForgotPasswordDto) {
    const { email } = forgotPassword;

    const user = await this.usersRepository.findOne({
      where: { email },
    });

    if (!user) {
      throw new BadRequestException('User with this email does not exist');
    }

    if (!user.isEmailVerified) {
      throw new UnauthorizedException({
        status: false,
        message: 'User with this email is not verified',
      });
    }

    const otp = this._generateOtp();
    // Store OTP in Redis for 10 minutes
    await this.cacheManager.set(
      `otp:${email}:${OtpType.FORGOT_PASSWORD}`,
      otp,
      600000,
    );

    await this._sendOtpEmail(email, otp, OtpType.FORGOT_PASSWORD);

    return {
      message: 'OTP sent successfully',
    };
  }

  async resendOtp(resendOtpDto: ResendOtpDto) {
    const { email, type } = resendOtpDto;

    const user = await this.usersRepository.findOne({
      where: { email },
    });
    if (!user) {
      throw new BadRequestException('User with this email does not exist');
    }

    if (type === OtpType.EMAIL_VERIFICATION && user.isEmailVerified) {
      throw new BadRequestException('User is already verified');
    }

    const otp = this._generateOtp();
    // Store OTP in Redis for 10 minutes
    await this.cacheManager.set(`otp:${email}:${type}`, otp, 600000);

    await this._sendOtpEmail(user.email, otp, type);
    return {
      message: 'OTP sent successfully',
    };
  }

  async register(registerDto: RegisterDto) {
    const { name, email, password, userType } = registerDto;

    if (userType === UserType.ADMIN) {
      throw new BadRequestException({
        status: false,
        message: 'Cannot register as an Admin. its already created',
      });
    }

    const existingUser = await this.usersRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      throw new BadRequestException('User already exists');
    }

    const otp = this._generateOtp();
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = this.usersRepository.create({
      ...registerDto,
      password: hashedPassword,
      name,
      email,
      userType: userType ?? UserType.USER,
      profile: {
        name,
        email,
      },
    });

    const newUser = await this.usersRepository.save(user);

    // Store OTP in Redis for 10 minutes
    await this.cacheManager.set(
      `otp:${email}:${OtpType.EMAIL_VERIFICATION}`,
      otp,
      600000,
    );

    await this._sendOtpEmail(email, otp, OtpType.EMAIL_VERIFICATION);

    return {
      message: 'Signup successful. Please verify your email with the OTP sent.',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        userType: newUser.userType,
      },
    };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const user = await this.usersRepository.findOne({
      where: { email: dto.email },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Retrieve OTP from Redis
    const storedOtp = await this.cacheManager.get<string>(
      `otp:${dto.email}:${dto.otpType}`,
    );

    if (!storedOtp || storedOtp !== dto.otp) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    // 2. Handle based on Type
    if (dto.otpType === OtpType.EMAIL_VERIFICATION) {
      user.isEmailVerified = true;
      await this.usersRepository.save(user);

      // Clear OTP from Redis after success
      await this.cacheManager.del(`otp:${dto.email}:${dto.otpType}`);

      return {
        message: 'Verification successful',
        isEmailVerified: user.isEmailVerified,
      };
    }

    if (dto.otpType === OtpType.FORGOT_PASSWORD) {
      const resetToken = await this._signToken(
        {
          email: user.email,
          id: user.id,
          type: TokenType.RESET_PASSWORD,
          userType: user.userType,
        },
        '15m',
      );

      // Save resetToken to Redis for 15 minutes
      await this.cacheManager.set(
        `reset_token:${user.email}`,
        resetToken,
        900000,
      );

      // Clear OTP from Redis after success
      await this.cacheManager.del(`otp:${dto.email}:${dto.otpType}`);

      return {
        message: 'OTP verified. You can now reset your password.',
        resetToken,
      };
    }
  }

  async signin(logindto: LoginDto) {
    const { email, password } = logindto;

    const user = await this.usersRepository.findOne({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException({
        status: false,
        message: 'Invalid Creadentials, Please try again',
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException({
        status: false,
        message: 'Invalid Creadentials, Please try again',
      });
    }

    if (!user.isEmailVerified) {
      const otp = this._generateOtp();
      // Store OTP in Redis for 10 minutes
      await this.cacheManager.set(
        `otp:${email}:${OtpType.EMAIL_VERIFICATION}`,
        otp,
        600000,
      );

      await this._sendOtpEmail(user.email, otp, OtpType.EMAIL_VERIFICATION);

      throw new UnauthorizedException({
        status: false,
        message: 'Email not verified. A new OTP has been sent to your email.',
      });
    }

    const token = await this._signToken(
      {
        email: user.email,
        id: user.id,
        type: TokenType.LOGIN,
        userType: user.userType, // Include userType in JWT payload
      },
      '7d',
    );

    return {
      message: 'Login Succesful',
      user: {
        token,
        id: user.id,
        name: user.name,
        email: user.email,
        userType: user.userType,
      },
    };
  }

  async validate(token: string): Promise<ITokenPayload | null> {
    try {
      return await this._jwt.verifyAsync<ITokenPayload>(token);
    } catch {
      return null;
    }
  }
}
