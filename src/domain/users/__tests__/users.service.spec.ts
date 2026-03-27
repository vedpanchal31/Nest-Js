import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from '../users.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { Profile } from '../entities/profile.entity';
import { UserType } from '../../../core/constants/app.constants';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashedPassword123'),
  compare: jest.fn(),
}));

describe('UsersService', () => {
  let service: UsersService;
  let usersRepository: jest.Mocked<Repository<User>>;
  let mailerService: jest.Mocked<MailerService>;

  const mockProfile: Profile = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    name: 'Test User',
    email: 'test@example.com',
    countryCode: '+1',
    countryShortcode: 'US',
    mobile: '1234567890',
    address: '123 Main St, New York, NY',
    dateOfBirth: new Date('1990-01-01'),
    user: {} as User,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null as unknown as Date,
  };

  const mockUser: User = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Test User',
    email: 'test@example.com',
    password: 'hashedPassword123',
    isEmailVerified: true,
    userType: UserType.USER,
    profile: mockProfile,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null as unknown as Date,
    roles: [],
    products: [],
  };

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[mockUser], 1]),
  };

  beforeEach(async () => {
    const usersRepositoryMock = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
      findOne: jest.fn(),
      create: jest.fn().mockReturnValue(mockUser),
      save: jest.fn().mockResolvedValue(mockUser),
      softRemove: jest.fn().mockResolvedValue(mockUser),
    };

    const mailerServiceMock = {
      sendMail: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: usersRepositoryMock,
        },
        {
          provide: MailerService,
          useValue: mailerServiceMock,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    usersRepository = module.get(getRepositoryToken(User));
    mailerService = module.get(MailerService);

    jest.clearAllMocks();
    mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockUser], 1]);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAllUsers', () => {
    it('should return paginated users', async () => {
      const result = await service.getAllUsers(1, 10);

      expect(usersRepository.createQueryBuilder).toHaveBeenCalledWith('user');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('user.profile', 'profile');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('user.roles', 'roles');
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('user.createdAt', 'DESC');
      expect(result).toEqual({
        users: [mockUser],
        total: 1,
        page: 1,
        limit: 10,
      });
    });

    it('should apply search filter when provided', async () => {
      await service.getAllUsers(1, 10, 'test');

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(user.name ILIKE :search OR user.email ILIKE :search)',
        { search: '%test%' },
      );
    });

    it('should apply userType filter when provided', async () => {
      await service.getAllUsers(1, 10, undefined, UserType.ADMIN);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'user.userType = :userType',
        { userType: UserType.ADMIN },
      );
    });

    it('should calculate correct skip value for page 2', async () => {
      await service.getAllUsers(2, 10);

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(10);
    });
  });

  describe('findOne', () => {
    it('should return a user by id with relations', async () => {
      usersRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findOne(mockUser.id);

      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        relations: ['profile', 'roles', 'roles.permissions'],
      });
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException when user not found', async () => {
      usersRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByEmail', () => {
    it('should return a user by email with relations', async () => {
      usersRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findByEmail(mockUser.email);

      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { email: mockUser.email },
        relations: ['profile', 'roles', 'roles.permissions'],
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      usersRepository.findOne.mockResolvedValue(null);

      const result = await service.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('updateProfile', () => {
    const updateProfileDto = {
      name: 'Updated Name',
      address: '456 New Address, Boston, MA',
      mobile: '9876543210',
      countryCode: '+44',
      countryShortcode: 'GB',
      dateOfBirth: '1995-05-15',
    };

    it('should update user profile successfully', async () => {
      usersRepository.findOne.mockResolvedValue(mockUser);
      usersRepository.save.mockResolvedValue({
        ...mockUser,
        name: updateProfileDto.name,
        profile: {
          ...mockProfile,
          name: updateProfileDto.name,
          address: updateProfileDto.address,
          mobile: updateProfileDto.mobile,
          countryCode: updateProfileDto.countryCode,
          countryShortcode: updateProfileDto.countryShortcode,
          dateOfBirth: new Date(updateProfileDto.dateOfBirth),
        },
      });

      const result = await service.updateProfile(mockUser.id, updateProfileDto);

      expect(usersRepository.save).toHaveBeenCalled();
      expect(result.name).toBe(updateProfileDto.name);
      expect(result.profile.name).toBe(updateProfileDto.name);
      expect(result.profile.address).toBe(updateProfileDto.address);
    });

    it('should update only provided fields', async () => {
      const partialUpdate = { name: 'New Name Only' };
      usersRepository.findOne.mockResolvedValue(mockUser);
      usersRepository.save.mockResolvedValue({
        ...mockUser,
        name: partialUpdate.name,
        profile: {
          ...mockProfile,
          name: partialUpdate.name,
        },
      });

      await service.updateProfile(mockUser.id, partialUpdate as any);

      expect(usersRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when user not found', async () => {
      usersRepository.findOne.mockResolvedValue(null);

      await expect(service.updateProfile('non-existent-id', updateProfileDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should convert dateOfBirth string to Date object', async () => {
      usersRepository.findOne.mockResolvedValue(mockUser);
      const saveSpy = jest.fn().mockResolvedValue({
        ...mockUser,
        profile: {
          ...mockProfile,
          dateOfBirth: new Date('1995-05-15'),
        },
      });
      usersRepository.save = saveSpy;

      await service.updateProfile(mockUser.id, { dateOfBirth: '1995-05-15' } as any);

      const savedUser = saveSpy.mock.calls[0][0];
      expect(savedUser.profile.dateOfBirth).toBeInstanceOf(Date);
    });
  });

  describe('removeUser', () => {
    it('should soft remove user successfully', async () => {
      usersRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.removeUser(mockUser.id);

      expect(usersRepository.softRemove).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException when user not found', async () => {
      usersRepository.findOne.mockResolvedValue(null);

      await expect(service.removeUser('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });
});
