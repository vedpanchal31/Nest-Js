import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Brackets, Not, Repository } from 'typeorm';
import { UpdateProfileDto } from './dtos/update-profile.dto';
import { UserType } from 'src/core/constants/app.constants';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async getAllUsers(
    page: number,
    limit: number,
    search?: string,
    userType?: UserType,
  ) {
    const skip = (page - 1) * limit;

    const query = this.usersRepository
      .createQueryBuilder('user')
      .orderBy('user.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (userType) {
      query.andWhere('user.userType = :userType', { userType });
    }

    if (search) {
      query.andWhere(
        new Brackets((qb) => {
          qb.where('user.name ILike :search', {
            search: `%${search}%`,
          }).orWhere('user.email ILike :search', {
            search: `%${search}%`,
          });
        }),
      );
    }

    const [items, totalItems] = await query.getManyAndCount();

    const totalPages = Math.ceil(totalItems / limit);

    return {
      data: items,
      totalItems,
      totalPages,
      currentPage: page,
    };
  }

  async findOne(id: string) {
    return await this.usersRepository.findOne({
      where: { id },
      relations: ['profile'],
      select: {
        id: true,
        name: true,
        email: true,
        isEmailVerified: true,
        userType: true,
        createdAt: true,
        updatedAt: true,
        profile: {
          id: true,
          name: true,
          email: true,
          countryCode: true,
          countryShortcode: true,
          mobile: true,
          address: true,
          dateOfBirth: true,
        },
      },
    });
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['profile'],
    });

    if (!user) throw new NotFoundException('User not found');

    const profile = user.profile;

    if (profile.address === null && !dto.address) {
      throw new BadRequestException('Address is required');
    }

    if (profile.dateOfBirth === null && !dto.dateOfBirth) {
      throw new BadRequestException('Date of birth is required');
    }

    if (profile.mobile === null && !dto.mobile) {
      throw new BadRequestException('Mobile details are required');
    }

    if (dto.dateOfBirth) {
      const dob = new Date(dto.dateOfBirth);
      const today = new Date();

      if (dob > today) {
        throw new BadRequestException('Date of birth cannot be in the future');
      }

      profile.dateOfBirth = dob;
    }

    if (dto.mobile) {
      const { countryCode, countryShortcode, mobile } = dto;

      const existingUser = await this.usersRepository.findOne({
        where: {
          id: Not(userId),
          profile: {
            countryCode,
            countryShortcode,
            mobile,
          },
        },
      });

      if (existingUser) {
        throw new BadRequestException('Phone number already exists');
      }

      profile.countryCode = countryCode;
      profile.countryShortcode = countryShortcode;
      profile.mobile = mobile;
    }

    if (dto.address) {
      profile.address = dto.address;
    }

    if (dto.name) {
      profile.name = dto.name;
      user.name = dto.name;
    }

    await this.usersRepository.save(user);

    return {
      message: 'Profile updated successfully',
      profile: await this.findOne(userId),
    };
  }

  async removeUser(userId: string) {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['profile'],
    });

    if (!user) throw new NotFoundException('User not found');

    await this.usersRepository.softRemove(user);

    return {
      message: 'User deleted successfully',
    };
  }
}
