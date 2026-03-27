import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from '../products.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Product } from '../entities/product.entity';
import { ProductImage } from '../entities/product-image.entity';
import { Repository } from 'typeorm';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { CloudinaryService } from '../../../core/cloudinary/cloudinary.service';
import { CategoriesService } from '../../categories/categories.service';
import { UsersService } from '../../users/users.service';
import { UserType } from '../../../core/constants/app.constants';

describe('ProductsService - Comprehensive', () => {
  let service: ProductsService;
  let productsRepository: jest.Mocked<Repository<Product>>;
  let productImageRepository: jest.Mocked<Repository<ProductImage>>;
  let cloudinaryService: jest.Mocked<CloudinaryService>;
  let categoriesService: jest.Mocked<CategoriesService>;
  let usersService: jest.Mocked<UsersService>;

  let consoleErrorSpy: jest.SpyInstance;

  beforeAll(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  const mockSupplier = {
    id: 'supplier-uuid',
    name: 'Test Supplier',
    email: 'supplier@example.com',
    userType: UserType.SUPPLIER,
  };

  const mockAdmin = {
    id: 'admin-uuid',
    email: 'admin@example.com',
    type: 2,
    userType: UserType.ADMIN,
  };

  const mockCategory = {
    id: 'category-uuid',
    name: 'Electronics',
  };

  const mockProduct = {
    id: 'product-uuid',
    name: 'Wireless Mouse',
    description: 'A highly responsive wireless mouse.',
    price: 25.99,
    supplier: { id: 'supplier-uuid' },
    category: { id: 'category-uuid' },
    images: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as Product;

  beforeEach(async () => {
    const productsRepositoryMock = {
      findOne: jest.fn(),
      create: jest.fn().mockReturnValue(mockProduct),
      save: jest.fn().mockResolvedValue(mockProduct),
      remove: jest.fn().mockResolvedValue(undefined),
      createQueryBuilder: jest.fn().mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockProduct], 1]),
      }),
    };

    const productImageRepositoryMock = {
      create: jest.fn().mockReturnValue({ id: 'image-uuid', url: 'http://image.url' }),
      save: jest.fn().mockResolvedValue({ id: 'image-uuid', url: 'http://image.url' }),
    };

    const cloudinaryServiceMock = {
      uploadImage: jest.fn().mockResolvedValue({ secure_url: 'http://image.url' }),
    };

    const categoriesServiceMock = {
      getAllCategoriesById: jest.fn().mockResolvedValue(mockCategory),
    };

    const usersServiceMock = {
      findOne: jest.fn().mockResolvedValue(mockSupplier),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: getRepositoryToken(Product),
          useValue: productsRepositoryMock,
        },
        {
          provide: getRepositoryToken(ProductImage),
          useValue: productImageRepositoryMock,
        },
        {
          provide: CloudinaryService,
          useValue: cloudinaryServiceMock,
        },
        {
          provide: CategoriesService,
          useValue: categoriesServiceMock,
        },
        {
          provide: UsersService,
          useValue: usersServiceMock,
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    productsRepository = module.get(getRepositoryToken(Product));
    productImageRepository = module.get(getRepositoryToken(ProductImage));
    cloudinaryService = module.get(CloudinaryService);
    categoriesService = module.get(CategoriesService);
    usersService = module.get(UsersService);

    jest.clearAllMocks();
  });

  describe('createProduct - Business Logic Validation', () => {
    const mockImages = [{ originalname: 'test.jpg' }] as Express.Multer.File[];

    it('should throw BadRequestException when name and description are the same', async () => {
      const dto = {
        name: 'Same Text',
        description: 'Same Text',
        price: '25.99',
        categoryId: 'category-uuid',
      };

      await expect(
        service.createProduct({ id: 'supplier-uuid', email: 'supplier@test.com', type: 2, userType: UserType.SUPPLIER }, dto, mockImages),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when name and description are same case-insensitive', async () => {
      const dto = {
        name: 'SAME TEXT',
        description: 'same text',
        price: '25.99',
        categoryId: 'category-uuid',
      };

      await expect(
        service.createProduct({ id: 'supplier-uuid', email: 'supplier@test.com', type: 2, userType: UserType.SUPPLIER }, dto, mockImages),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when product with same name already exists for supplier', async () => {
      productsRepository.findOne.mockResolvedValue(mockProduct);

      const dto = {
        name: 'Wireless Mouse',
        description: 'Different description.',
        price: '25.99',
        categoryId: 'category-uuid',
      };

      await expect(
        service.createProduct({ id: 'supplier-uuid', email: 'supplier@test.com', type: 2, userType: UserType.SUPPLIER }, dto, mockImages),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when category does not exist', async () => {
      productsRepository.findOne.mockResolvedValue(null);
      categoriesService.getAllCategoriesById.mockResolvedValue(null as any);

      const dto = {
        name: 'Wireless Mouse',
        description: 'A highly responsive wireless mouse.',
        price: '25.99',
        categoryId: 'non-existent-category',
      };

      await expect(
        service.createProduct({ id: 'supplier-uuid', email: 'supplier@test.com', type: 2, userType: UserType.SUPPLIER }, dto as any, mockImages),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when admin does not provide supplierId', async () => {
      productsRepository.findOne.mockResolvedValue(null);
      const dto = {
        name: 'Wireless Mouse',
        description: 'A highly responsive wireless mouse.',
        price: '25.99',
        categoryId: 'category-uuid',
      };

      await expect(service.createProduct(mockAdmin, dto, mockImages)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when admin provides invalid supplierId', async () => {
      productsRepository.findOne.mockResolvedValue(null);
      usersService.findOne.mockResolvedValue(null as any);

      const dto = {
        name: 'Wireless Mouse',
        description: 'A highly responsive wireless mouse.',
        price: '25.99',
        categoryId: 'category-uuid',
        supplierId: 'invalid-supplier',
      };

      await expect(service.createProduct(mockAdmin, dto, mockImages)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when admin provides non-supplier userId', async () => {
      productsRepository.findOne.mockResolvedValue(null);
      usersService.findOne.mockResolvedValue({ ...mockSupplier, userType: UserType.USER } as any);

      const dto = {
        name: 'Wireless Mouse',
        description: 'A highly responsive wireless mouse.',
        price: '25.99',
        categoryId: 'category-uuid',
        supplierId: 'user-id-not-supplier',
      };

      await expect(service.createProduct(mockAdmin, dto, mockImages)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should successfully create product as supplier', async () => {
      productsRepository.findOne.mockResolvedValue(null);

      const dto = {
        name: 'Wireless Mouse',
        description: 'A highly responsive wireless mouse.',
        price: '25.99',
        categoryId: 'category-uuid',
      };

      const result = await service.createProduct(
        { id: 'supplier-uuid', email: 'supplier@test.com', type: 2, userType: UserType.SUPPLIER },
        dto,
        mockImages,
      );

      expect(result).toBeDefined();
      expect(productsRepository.save).toHaveBeenCalled();
      expect(cloudinaryService.uploadImage).toHaveBeenCalled();
    });

    it('should successfully create product as admin with valid supplierId', async () => {
      productsRepository.findOne.mockResolvedValue(null);
      usersService.findOne.mockResolvedValue(mockSupplier as any);

      const dto = {
        name: 'Wireless Mouse',
        description: 'A highly responsive wireless mouse.',
        price: '25.99',
        categoryId: 'category-uuid',
        supplierId: 'supplier-uuid',
      };

      const result = await service.createProduct(mockAdmin, dto, mockImages);

      expect(result).toBeDefined();
      expect(productsRepository.save).toHaveBeenCalled();
    });

    it('should parse price as float correctly', async () => {
      productsRepository.findOne.mockResolvedValue(null);
      const saveSpy = jest.fn().mockResolvedValue({ ...mockProduct, price: 25.99 });
      productsRepository.save = saveSpy;

      const dto = {
        name: 'Wireless Mouse',
        description: 'A highly responsive wireless mouse.',
        price: '25.99',
        categoryId: 'category-uuid',
      };

      await service.createProduct(
        { id: 'supplier-uuid', email: 'supplier@test.com', type: 2, userType: UserType.SUPPLIER },
        dto,
        mockImages,
      );

      const savedProduct = saveSpy.mock.calls[0][0];
      expect(savedProduct.price).toBe(25.99);
    });
  });

  describe('getProducts - Strict Query Parameter Validation', () => {
    it('should return products with pagination', async () => {
      const result = await service.getProducts(1, 10);

      expect(result.data).toBeDefined();
      expect(result.totalItems).toBe(1);
      expect(result.totalPages).toBe(1);
      expect(result.currentPage).toBe(1);
    });

    it('should calculate correct skip value for page 2', async () => {
      const qbMock = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      productsRepository.createQueryBuilder.mockReturnValue(qbMock as any);

      await service.getProducts(2, 10);

      expect(qbMock.skip).toHaveBeenCalledWith(10);
    });

    it('should apply search filter correctly', async () => {
      const qbMock = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      productsRepository.createQueryBuilder.mockReturnValue(qbMock as any);

      await service.getProducts(1, 10, 'mouse');

      expect(qbMock.andWhere).toHaveBeenCalled();
    });

    it('should apply categoryId filter correctly', async () => {
      const qbMock = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      productsRepository.createQueryBuilder.mockReturnValue(qbMock as any);

      await service.getProducts(1, 10, undefined, 'category-uuid');

      expect(qbMock.andWhere).toHaveBeenCalledWith('category.id = :categoryId', {
        categoryId: 'category-uuid',
      });
    });

    it('should filter by supplier when user is SUPPLIER', async () => {
      const qbMock = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      productsRepository.createQueryBuilder.mockReturnValue(qbMock as any);

      await service.getProducts(1, 10, undefined, undefined, {
        id: 'supplier-uuid',
        email: 'supplier@test.com',
        type: 2,
        userType: UserType.SUPPLIER,
      });

      expect(qbMock.andWhere).toHaveBeenCalledWith('supplier.id = :supplierId', {
        supplierId: 'supplier-uuid',
      });
    });

    it('should not filter by supplier when user is ADMIN', async () => {
      const qbMock = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      productsRepository.createQueryBuilder.mockReturnValue(qbMock as any);

      await service.getProducts(1, 10, undefined, undefined, mockAdmin);

      expect(qbMock.andWhere).not.toHaveBeenCalledWith(
        'supplier.id = :supplierId',
        expect.any(Object),
      );
    });
  });

  describe('updateProduct - Strict ID and Validation', () => {
    const mockImages = [{ originalname: 'test.jpg' }] as Express.Multer.File[];

    it('should throw BadRequestException when product ID is invalid', async () => {
      productsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateProduct(
          'invalid-id',
          { id: 'supplier-uuid', email: 'supplier@test.com', type: 2, userType: UserType.SUPPLIER },
          { name: 'Updated Name' },
          mockImages,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when supplier tries to update another supplier product', async () => {
      productsRepository.findOne.mockResolvedValue({
        ...mockProduct,
        supplier: { id: 'different-supplier-uuid' },
      } as any);

      await expect(
        service.updateProduct(
          'product-uuid',
          { id: 'supplier-uuid', email: 'supplier@test.com', type: 2, userType: UserType.SUPPLIER },
          { name: 'Updated Name' },
          mockImages,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow admin to update any product', async () => {
      productsRepository.findOne.mockResolvedValue({
        ...mockProduct,
        supplier: { id: 'different-supplier-uuid' },
      } as any);

      const result = await service.updateProduct('product-uuid', mockAdmin, { name: 'Updated' }, []);

      expect(result).toBeDefined();
    });

    it('should update only provided fields', async () => {
      const existingProduct = {
        ...mockProduct,
        name: 'Original Name',
        description: 'Original Description',
        price: 25.99,
      };
      productsRepository.findOne.mockResolvedValue(existingProduct as any);
      const saveSpy = jest.fn().mockResolvedValue({ ...existingProduct, name: 'New Name' });
      productsRepository.save = saveSpy;

      await service.updateProduct(
        'product-uuid',
        { id: 'supplier-uuid', email: 'supplier@test.com', type: 2, userType: UserType.SUPPLIER },
        { name: 'New Name' },
        [],
      );

      const savedProduct = saveSpy.mock.calls[0][0];
      expect(savedProduct.name).toBe('New Name');
      expect(savedProduct.description).toBe('Original Description');
      expect(savedProduct.price).toBe(25.99);
    });

    it('should parse updated price as float', async () => {
      productsRepository.findOne.mockResolvedValue(mockProduct as any);
      const saveSpy = jest.fn().mockResolvedValue({ ...mockProduct, price: 29.99 });
      productsRepository.save = saveSpy;

      await service.updateProduct(
        'product-uuid',
        { id: 'supplier-uuid', email: 'supplier@test.com', type: 2, userType: UserType.SUPPLIER },
        { price: '29.99' },
        [],
      );

      const savedProduct = saveSpy.mock.calls[0][0];
      expect(savedProduct.price).toBe(29.99);
    });
  });

  describe('deleteProduct - Strict ID and Authorization Validation', () => {
    it('should throw BadRequestException when product ID is invalid', async () => {
      productsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.deleteProduct('invalid-id', {
          id: 'supplier-uuid',
          email: 'supplier@test.com',
          type: 2,
          userType: UserType.SUPPLIER,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException when supplier tries to delete another supplier product', async () => {
      productsRepository.findOne.mockResolvedValue({
        ...mockProduct,
        supplier: { id: 'different-supplier-uuid' },
      } as any);

      await expect(
        service.deleteProduct('product-uuid', {
          id: 'supplier-uuid',
          email: 'supplier@test.com',
          type: 2,
          userType: UserType.SUPPLIER,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow supplier to delete their own product', async () => {
      productsRepository.findOne.mockResolvedValue(mockProduct as any);

      const result = await service.deleteProduct('product-uuid', {
        id: 'supplier-uuid',
        email: 'supplier@test.com',
        type: 2,
        userType: UserType.SUPPLIER,
      });

      expect(result.message).toBe('Product deleted successfully');
      expect(productsRepository.remove).toHaveBeenCalled();
    });

    it('should allow admin to delete any product', async () => {
      productsRepository.findOne.mockResolvedValue({
        ...mockProduct,
        supplier: { id: 'different-supplier-uuid' },
      } as any);

      const result = await service.deleteProduct('product-uuid', mockAdmin);

      expect(result.message).toBe('Product deleted successfully');
      expect(productsRepository.remove).toHaveBeenCalled();
    });

    it('should return correct response structure on delete', async () => {
      productsRepository.findOne.mockResolvedValue(mockProduct as any);

      const result = await service.deleteProduct('product-uuid', {
        id: 'supplier-uuid',
        email: 'supplier@test.com',
        type: 2,
        userType: UserType.SUPPLIER,
      });

      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('id');
      expect(result.id).toBe('product-uuid');
    });
  });
});
