import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesService } from '../categories.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Category } from '../entities/category.entity';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CloudinaryService } from '../../../core/cloudinary/cloudinary.service';

describe('CategoriesService - Comprehensive', () => {
  let service: CategoriesService;
  let categoriesRepository: jest.Mocked<Repository<Category>>;
  let cloudinaryService: jest.Mocked<CloudinaryService>;

  const mockCategory = {
    id: 'category-uuid',
    name: 'Electronics',
    description: 'Electronic devices and gadgets',
    image: 'http://image.url/category.jpg',
    products: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as Category;

  const mockCategoriesRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn().mockReturnValue(mockCategory),
    save: jest.fn().mockResolvedValue(mockCategory),
    softRemove: jest.fn().mockResolvedValue(mockCategory),
    createQueryBuilder: jest.fn().mockReturnValue({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[mockCategory], 1]),
    }),
  };

  const mockCloudinaryService = {
    uploadImage: jest.fn().mockResolvedValue({
      secure_url: 'http://cloudinary.com/image.jpg',
    }),
  };

  const createMockQueryBuilder = (
    overrides: Record<string, unknown> = {},
  ): SelectQueryBuilder<Category> =>
    ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[mockCategory], 1]),
      ...overrides,
    }) as unknown as SelectQueryBuilder<Category>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        {
          provide: getRepositoryToken(Category),
          useValue: mockCategoriesRepository,
        },
        {
          provide: CloudinaryService,
          useValue: mockCloudinaryService,
        },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
    categoriesRepository = module.get(getRepositoryToken(Category));
    cloudinaryService = module.get(CloudinaryService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAllCategories - Pagination and Search', () => {
    it('should return categories with pagination', async () => {
      const result = await service.getAllCategories(1, 10);

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('totalItems');
      expect(result).toHaveProperty('totalPages');
      expect(result).toHaveProperty('currentPage');
      expect(result.currentPage).toBe(1);
      expect(result.data).toHaveLength(1);
    });

    it('should calculate correct skip value for page 2', async () => {
      const mockQueryBuilder = createMockQueryBuilder({
        andWhere: undefined,
      });
      categoriesRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.getAllCategories(2, 10);

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(10);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
    });

    it('should apply search filter when provided', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      categoriesRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.getAllCategories(1, 10, 'Electronics');

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'category.name ILike :search OR category.description ILike :search',
        { search: '%Electronics%' },
      );
    });

    it('should not apply search filter when not provided', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      categoriesRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.getAllCategories(1, 10);

      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalled();
    });
  });

  describe('getAllCategoriesById - ID Validation', () => {
    it('should return category by id with products', async () => {
      categoriesRepository.findOne.mockResolvedValue(mockCategory);

      const result = await service.getAllCategoriesById('category-uuid');

      expect(result).toEqual(mockCategory);
      expect(categoriesRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'category-uuid' },
        relations: ['products'],
      });
    });

    it('should throw NotFoundException when category not found', async () => {
      categoriesRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getAllCategoriesById('non-existent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createCategory - Business Logic Validation', () => {
    const mockImageFile = { originalname: 'test.jpg' } as Express.Multer.File;
    const mockImageFiles = [mockImageFile];

    it('should throw BadRequestException when category name already exists', async () => {
      categoriesRepository.findOne.mockResolvedValue(mockCategory);

      const dto = {
        name: 'Electronics',
        description: 'Test description',
      };

      await expect(service.createCategory(dto, mockImageFiles)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should successfully create category without image', async () => {
      categoriesRepository.findOne.mockResolvedValue(null);

      const dto = {
        name: 'New Category',
        description: 'New description',
      };

      const result = await service.createCategory(dto);

      expect(result).toBeDefined();
      expect(categoriesRepository.save).toHaveBeenCalled();
      expect(cloudinaryService.uploadImage).not.toHaveBeenCalled();
    });

    it('should upload image to Cloudinary when imageFile is provided', async () => {
      categoriesRepository.findOne.mockResolvedValue(null);

      const dto = {
        name: 'New Category',
        description: 'New description',
      };

      await service.createCategory(dto, mockImageFiles);

      expect(cloudinaryService.uploadImage).toHaveBeenCalledWith(
        mockImageFile,
        'E-commerce',
      );
    });

    it('should save category with image URL when image uploaded', async () => {
      categoriesRepository.findOne.mockResolvedValue(null);
      const createSpy = jest
        .fn()
        .mockReturnValue({ ...mockCategory, name: 'New Category' });
      categoriesRepository.create = createSpy;
      const saveSpy = jest.fn().mockResolvedValue({
        ...mockCategory,
        name: 'New Category',
        image: 'http://cloudinary.com/image.jpg',
      });
      categoriesRepository.save = saveSpy;

      const dto = {
        name: 'New Category',
        description: 'New description',
      };

      await service.createCategory(dto, mockImageFiles);

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Category',
          description: 'New description',
          image: 'http://cloudinary.com/image.jpg',
        }),
      );
    });
  });

  describe('updateCategory - ID and Data Validation', () => {
    const mockImageFile = { originalname: 'test.jpg' } as Express.Multer.File;

    it('should throw NotFoundException when category not found', async () => {
      categoriesRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateCategory('non-existent-id', { name: 'Updated' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update only name when provided', async () => {
      categoriesRepository.findOne.mockResolvedValue({ ...mockCategory });

      const dto = { name: 'Updated Electronics' };

      await service.updateCategory('category-uuid', dto);

      expect(categoriesRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Updated Electronics' }),
      );
    });

    it('should update only description when provided', async () => {
      categoriesRepository.findOne.mockResolvedValue({ ...mockCategory });

      const dto = { description: 'Updated description' };

      await service.updateCategory('category-uuid', dto);

      expect(categoriesRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Electronics',
          description: 'Updated description',
        }),
      );
    });

    it('should update both name and description when provided', async () => {
      categoriesRepository.findOne.mockResolvedValue({ ...mockCategory });

      const dto = { name: 'Updated Name', description: 'Updated description' };

      await service.updateCategory('category-uuid', dto);

      expect(categoriesRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Updated Name',
          description: 'Updated description',
        }),
      );
    });

    it('should upload new image to Cloudinary when imageFile provided', async () => {
      categoriesRepository.findOne.mockResolvedValue({ ...mockCategory });

      await service.updateCategory('category-uuid', {}, mockImageFile);

      expect(cloudinaryService.uploadImage).toHaveBeenCalledWith(
        mockImageFile,
        'E-commerce',
      );
    });

    it('should not upload image when no imageFile provided', async () => {
      categoriesRepository.findOne.mockResolvedValue({ ...mockCategory });

      await service.updateCategory('category-uuid', { name: 'Updated' });

      expect(cloudinaryService.uploadImage).not.toHaveBeenCalled();
    });
  });

  describe('deleteCategory - ID and Constraint Validation', () => {
    it('should throw NotFoundException when category not found', async () => {
      categoriesRepository.findOne.mockResolvedValue(null);

      await expect(service.deleteCategory('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when category has products', async () => {
      categoriesRepository.findOne.mockResolvedValue({
        ...mockCategory,
        products: [{ id: 'product-1' } as any],
      });

      await expect(service.deleteCategory('category-uuid')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should successfully delete category without products', async () => {
      categoriesRepository.findOne.mockResolvedValue({
        ...mockCategory,
        products: [],
      });

      const result = await service.deleteCategory('category-uuid');

      expect(categoriesRepository.softRemove).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should check for products relation before delete', async () => {
      categoriesRepository.findOne.mockResolvedValue({
        ...mockCategory,
        products: [],
      });

      await service.deleteCategory('category-uuid');

      expect(categoriesRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'category-uuid' },
        relations: ['products'],
      });
    });
  });
});
