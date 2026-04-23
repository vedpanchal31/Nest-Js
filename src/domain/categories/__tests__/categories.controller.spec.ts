import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesController } from '../categories.controller';
import { CategoriesService } from '../categories.service';
import { BulkUploadService } from '../../../core/bulk-upload/bulk-upload.service';

jest.mock('../../../core/guards/auth.guard', () => ({
  AuthGuard: jest.fn().mockImplementation(() => ({
    canActivate: jest.fn().mockReturnValue(true),
  })),
}));

jest.mock('../../../core/guards/role.guard', () => ({
  RoleGuard: jest.fn().mockImplementation(() => ({
    canActivate: jest.fn().mockReturnValue(true),
  })),
}));

describe('CategoriesController - Comprehensive', () => {
  let controller: CategoriesController;
  let service: jest.Mocked<CategoriesService>;

  const mockCategory = {
    id: 'category-uuid',
    name: 'Electronics',
    description: 'Electronic devices',
    image: 'http://image.url',
    products: [],
  };

  const mockCategoriesService = {
    getAllCategories: jest.fn().mockResolvedValue({
      data: [mockCategory],
      totalItems: 1,
      totalPages: 1,
      currentPage: 1,
    }),
    getAllCategoriesById: jest.fn().mockResolvedValue(mockCategory),
    createCategory: jest.fn().mockResolvedValue(mockCategory),
    updateCategory: jest
      .fn()
      .mockResolvedValue({ ...mockCategory, name: 'Updated' }),
    deleteCategory: jest.fn().mockResolvedValue(mockCategory),
  };

  const mockBulkUploadService = {
    generateSampleExcel: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoriesController],
      providers: [
        {
          provide: CategoriesService,
          useValue: mockCategoriesService,
        },
        {
          provide: BulkUploadService,
          useValue: mockBulkUploadService,
        },
      ],
    }).compile();

    controller = module.get<CategoriesController>(CategoriesController);
    service = module.get(CategoriesService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll - Query Parameter Validation', () => {
    it('should call service with default pagination values', async () => {
      await controller.findAll(1, 10);

      expect(service.getAllCategories).toHaveBeenCalledWith(1, 10, undefined);
    });

    it('should pass all query parameters to service', async () => {
      await controller.findAll(2, 20, 'electronics');

      expect(service.getAllCategories).toHaveBeenCalledWith(
        2,
        20,
        'electronics',
      );
    });

    it('should handle empty search parameter', async () => {
      await controller.findAll(1, 10, undefined);

      expect(service.getAllCategories).toHaveBeenCalledWith(1, 10, undefined);
    });
  });

  describe('findOne - Route Parameter Validation', () => {
    it('should pass correct ID to service', async () => {
      await controller.findOne('category-uuid');

      expect(service.getAllCategoriesById).toHaveBeenCalledWith(
        'category-uuid',
      );
    });

    it('should handle any ID format (validation at service level)', async () => {
      const customId = '550e8400-e29b-41d4-a716-446655440000';
      await controller.findOne(customId);

      expect(service.getAllCategoriesById).toHaveBeenCalledWith(customId);
    });

    it('should return category data', async () => {
      const result = await controller.findOne('category-uuid');

      expect(result).toEqual(mockCategory);
    });
  });

  describe('create - Request Body and File Validation', () => {
    const mockImageFile = { originalname: 'test.jpg' } as Express.Multer.File;
    const mockImageFiles = [mockImageFile];

    it('should successfully create category with image', async () => {
      const dto = {
        name: 'New Category',
        description: 'New description',
      };

      const result = await controller.create(dto, mockImageFiles);

      expect(result).toEqual(mockCategory);
      expect(service.createCategory).toHaveBeenCalledWith(dto, mockImageFiles);
    });

    it('should create category without image', async () => {
      const dto = {
        name: 'New Category',
        description: 'New description',
      };

      const result = await controller.create(dto, undefined);

      expect(result).toEqual(mockCategory);
      expect(service.createCategory).toHaveBeenCalledWith(dto, undefined);
    });

    it('should pass correct DTO structure to service', async () => {
      const dto = {
        name: 'Electronics',
        description: 'All electronic items',
      };

      await controller.create(dto, mockImageFiles);

      expect(service.createCategory).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Electronics',
          description: 'All electronic items',
        }),
        mockImageFiles,
      );
    });
  });

  describe('update - Route Parameter and Body Validation', () => {
    const mockImageFile = { originalname: 'test.jpg' } as Express.Multer.File;

    it('should pass correct ID to service', async () => {
      const dto = { name: 'Updated Name' };

      await controller.update('category-uuid', dto, undefined);

      expect(service.updateCategory).toHaveBeenCalledWith(
        'category-uuid',
        dto,
        undefined,
      );
    });

    it('should handle partial update', async () => {
      const dto = { name: 'Updated Only Name' };

      await controller.update('category-uuid', dto, undefined);

      expect(service.updateCategory).toHaveBeenCalledWith(
        'category-uuid',
        dto,
        undefined,
      );
    });

    it('should update with new image', async () => {
      const dto = { description: 'Updated description' };

      await controller.update('category-uuid', dto, mockImageFile);

      expect(service.updateCategory).toHaveBeenCalledWith(
        'category-uuid',
        dto,
        mockImageFile,
      );
    });

    it('should handle any ID format', async () => {
      const customId = 'custom-id-format';
      const dto = { name: 'Updated' };

      await controller.update(customId, dto, undefined);

      expect(service.updateCategory).toHaveBeenCalledWith(
        customId,
        dto,
        undefined,
      );
    });
  });

  describe('delete - Route Parameter Validation', () => {
    it('should pass correct ID to service', async () => {
      await controller.delete('category-uuid');

      expect(service.deleteCategory).toHaveBeenCalledWith('category-uuid');
    });

    it('should handle any ID format', async () => {
      const customId = 'custom-delete-id';
      await controller.delete(customId);

      expect(service.deleteCategory).toHaveBeenCalledWith(customId);
    });

    it('should return deleted category', async () => {
      const result = await controller.delete('category-uuid');

      expect(result).toEqual(mockCategory);
    });
  });
});
