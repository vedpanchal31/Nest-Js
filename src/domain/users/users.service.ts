import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { Profile } from './entities/profile.entity';
import { Role } from '../roles/entities/role.entity';
import { UserType } from 'src/core/constants/app.constants';
import { CreateManagedUserDto } from './dtos/create-managed-user.dto';
import { UpdateManagedUserDto } from './dtos/update-managed-user.dto';
import { UpdateProfileDto } from './dtos/update-profile.dto';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly mailerService: MailerService,
  ) { }

  async getAllUsers(
    page: number,
    limit: number,
    search?: string,
    userType?: UserType,
  ) {
    const query = this.usersRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.profile', 'profile')
      .leftJoinAndSelect('user.roles', 'roles');

    if (search) {
      query.andWhere('(user.name ILIKE :search OR user.email ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    if (userType) {
      query.andWhere('user.userType = :userType', { userType });
    }

    query
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('user.createdAt', 'DESC');

    const [users, total] = await query.getManyAndCount();

    return {
      users,
      total,
      page,
      limit,
    };
  }

  async findOne(id: string) {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['profile', 'roles', 'roles.permissions'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findByEmail(email: string) {
    return await this.usersRepository.findOne({
      where: { email },
      relations: ['profile', 'roles', 'roles.permissions'],
    });
  }

  async createUser(dto: CreateManagedUserDto) {
    const { email, name, userType, roleId } = dto;

    const existingUser = await this.usersRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    // Generate a secure dummy password
    const dummyPassword = Math.random().toString(36).slice(-8) + 'A1!';
    const hashedPassword = await bcrypt.hash(dummyPassword, 10);

    const user = this.usersRepository.create({
      name,
      email,
      password: hashedPassword,
      userType,
      isEmailVerified: true,
    });

    // Create a skeleton profile
    const profile = new Profile();
    profile.name = name;
    profile.email = email;
    user.profile = profile;

    if (roleId) {
      user.roles = [{ id: roleId } as Role];
    }

    const savedUser = await this.usersRepository.save(user);

    // Send welcome email with dummy password
    await this.sendWelcomeEmail(email, name, dummyPassword);

    return savedUser;
  }

  async updateUser(id: string, dto: UpdateManagedUserDto) {
    const user = await this.findOne(id);

    if (dto.name) user.name = dto.name;
    if (dto.userType) user.userType = dto.userType;

    if (dto.roleId) {
      user.roles = [{ id: dto.roleId } as Role];
    }

    return await this.usersRepository.save(user);
  }

  async updateProfile(id: string, dto: UpdateProfileDto) {
    const user = await this.findOne(id);

    if (dto.name) {
      user.name = dto.name;
      user.profile.name = dto.name;
    }

    if (dto.address) user.profile.address = dto.address;
    if (dto.mobile) user.profile.mobile = dto.mobile;
    if (dto.countryCode) user.profile.countryCode = dto.countryCode;
    if (dto.countryShortcode)
      user.profile.countryShortcode = dto.countryShortcode;
    if (dto.dateOfBirth) user.profile.dateOfBirth = new Date(dto.dateOfBirth);

    return await this.usersRepository.save(user);
  }

  async removeUser(id: string) {
    const user = await this.findOne(id);
    return await this.usersRepository.softRemove(user);
  }

  private async sendWelcomeEmail(
    email: string,
    name: string,
    password: string,
  ) {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Welcome to our platform',
        text: `Hello ${name},\n\nYour account has been created by the administrator.\n\nYour login credentials are:\nEmail: ${email}\nPassword: ${password}\n\nPlease change your password after logging in.\n\nBest regards,\nThe Team`,
      });
      console.log(`Welcome email sent to ${email}`);
    } catch (error) {
      console.error(`Failed to send welcome email to ${email}:`, error);
    }
  }
}
