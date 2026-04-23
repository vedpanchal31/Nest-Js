import { Test, TestingModule } from '@nestjs/testing';
import { ProductsController } from '../products.controller';
import { ProductsService } from '../products.service';
import { BulkUploadService } from '../../../core/bulk-upload/bulk-upload.service';
import { UserType } from '../../../core/constants/app.constants';
import { BadRequestException } from '@nestjs/common';
import { AuthGuard } from '../../../core/guards/auth.guard';
import { RoleGuard } from '../../../core/guards/role.guard';

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

describe('ProductsController - Comprehensive', () => {
  let controller: ProductsController;
  let service: jest.Mocked<ProductsService>;

  const mockProduct = {
    id: 'product-uuid',
    name: 'Wireless Mouse',
    description: 'A highly responsive wireless mouse.',
    price: 25.99,
    supplier: { id: 'supplier-uuid' },
    category: { id: 'category-uuid' },
    images: [],
  };

  const mockSupplierToken = {
    id: 'supplier-uuid',
    email: 'supplier@example.com',
    type: 2,
    userType: UserType.SUPPLIER,
  };

  const mockAdminToken = {
    id: 'admin-uuid',
    email: 'admin@example.com',
    type: 2,
    userType: UserType.ADMIN,
  };

  const mockProductsService = {
    createProduct: jest.fn(),
    getProducts: jest.fn(),
    updateProduct: jest.fn(),
    deleteProduct: jest.fn(),
  };

  const mockBulkUploadService = {
    generateSampleExcel: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        {
          provide: ProductsService,
          useValue: mockProductsService,
        },
        {
          provide: BulkUploadService,
          useValue: mockBulkUploadService,
        },
      ],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
    service = module.get(ProductsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createProduct - Request Body and File Validation', () => {
    const mockImages = [{ originalname: 'test.jpg' }] as Express.Multer.File[];

    it('should throw BadRequestException when no images provided', async () => {
      const dto = {
        name: 'Wireless Mouse',
        description: 'A highly responsive wireless mouse.',
        price: '25.99',
        categoryId: 'category-uuid',
      };

      await expect(
        controller.createProduct(
          { user: mockSupplierToken } as any,
          dto as any,
          [],
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when images array is empty', async () => {
      const dto = {
        name: 'Wireless Mouse',
        description: 'A highly responsive wireless mouse.',
        price: '25.99',
        categoryId: 'category-uuid',
      };

      await expect(
        controller.createProduct(
          { user: mockSupplierToken } as any,
          dto as any,
          [],
        ),
      ).rejects.toThrow('At least one product image is required');
    });

    it('should successfully create product with images', async () => {
      const dto = {
        name: 'Wireless Mouse',
        description: 'A highly responsive wireless mouse.',
        price: '25.99',
        categoryId: 'category-uuid',
      };
      service.createProduct.mockResolvedValue(mockProduct as any);

      const result = await controller.createProduct(
        { user: mockSupplierToken } as any,
        dto,
        mockImages,
      );

      expect(result).toEqual(mockProduct);
      expect(service.createProduct).toHaveBeenCalledWith(
        mockSupplierToken,
        dto,
        mockImages,
      );
    });

    it('should pass correct user token to service', async () => {
      const dto = {
        name: 'Wireless Mouse',
        description: 'A highly responsive wireless mouse.',
        price: '25.99',
        categoryId: 'category-uuid',
      };
      service.createProduct.mockResolvedValue(mockProduct as any);

      await controller.createProduct(
        { user: mockAdminToken } as any,
        dto,
        mockImages,
      );

      expect(service.createProduct).toHaveBeenCalledWith(
        mockAdminToken,
        expect.any(Object),
        mockImages,
      );
    });
  });

  describe('getProducts - Query Parameter Validation', () => {
    it('should call service with default pagination values', async () => {
      const mockResponse = {
        data: [mockProduct],
        totalItems: 1,
        totalPages: 1,
        currentPage: 1,
      };
      service.getProducts.mockResolvedValue(mockResponse as any);

      await controller.getProducts(
        1,
        10,
        undefined as any,
        undefined as any,
        { user: undefined } as any,
      );

      expect(service.getProducts).toHaveBeenCalledWith(
        1,
        10,
        undefined,
        undefined,
        undefined,
      );
    });

    it('should pass all query parameters to service', async () => {
      const mockResponse = {
        data: [mockProduct],
        totalItems: 1,
        totalPages: 1,
        currentPage: 2,
      };
      service.getProducts.mockResolvedValue(mockResponse as any);

      await controller.getProducts(2, 20, 'mouse', 'category-uuid', {
        user: mockSupplierToken,
      } as any);

      expect(service.getProducts).toHaveBeenCalledWith(
        2,
        20,
        'mouse',
        'category-uuid',
        mockSupplierToken,
      );
    });

    it('should handle public access without user token', async () => {
      const mockResponse = {
        data: [mockProduct],
        totalItems: 1,
        totalPages: 1,
        currentPage: 1,
      };
      service.getProducts.mockResolvedValue(mockResponse as any);

      await controller.getProducts(
        1,
        10,
        undefined as any,
        undefined as any,
        { user: undefined } as any,
      );

      expect(service.getProducts).toHaveBeenCalledWith(
        1,
        10,
        undefined,
        undefined,
        undefined,
      );
    });

    it('should return correct response structure', async () => {
      const mockResponse = {
        data: [mockProduct],
        totalItems: 1,
        totalPages: 1,
        currentPage: 1,
      };
      service.getProducts.mockResolvedValue(mockResponse as any);

      const result = await controller.getProducts(
        1,
        10,
        undefined as any,
        undefined as any,
        { user: undefined } as any,
      );

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('totalItems');
      expect(result).toHaveProperty('totalPages');
      expect(result).toHaveProperty('currentPage');
    });
  });

  describe('updateProduct - Route Parameter and Body Validation', () => {
    const mockImages = [{ originalname: 'test.jpg' }] as Express.Multer.File[];

    it('should pass correct ID parameter to service', async () => {
      const dto = { name: 'Updated Name' };
      service.updateProduct.mockResolvedValue({
        ...mockProduct,
        name: 'Updated Name',
      } as any);

      await controller.updateProduct(
        'product-uuid',
        { user: mockSupplierToken } as any,
        dto,
        mockImages,
      );

      expect(service.updateProduct).toHaveBeenCalledWith(
        'product-uuid',
        mockSupplierToken,
        dto,
        mockImages,
      );
    });

    it('should handle product ID in route parameter', async () => {
      const dto = { name: 'Updated Name' };
      service.updateProduct.mockResolvedValue({
        ...mockProduct,
        name: 'Updated Name',
      } as any);

      const productId = '550e8400-e29b-41d4-a716-446655440000';

      await controller.updateProduct(
        productId,
        { user: mockSupplierToken } as any,
        dto,
        [],
      );

      expect(service.updateProduct).toHaveBeenCalledWith(
        productId,
        expect.any(Object),
        expect.any(Object),
        expect.any(Array),
      );
    });

    it('should pass user token to service for authorization', async () => {
      const dto = { name: 'Updated Name' };
      service.updateProduct.mockResolvedValue({
        ...mockProduct,
        name: 'Updated Name',
      } as any);

      await controller.updateProduct(
        'product-uuid',
        { user: mockAdminToken } as any,
        dto,
        [],
      );

      expect(service.updateProduct).toHaveBeenCalledWith(
        expect.any(String),
        mockAdminToken,
        expect.any(Object),
        expect.any(Array),
      );
    });

    it('should handle partial updates', async () => {
      const dto = { price: '29.99' };
      service.updateProduct.mockResolvedValue({
        ...mockProduct,
        price: 29.99,
      } as any);

      const result = await controller.updateProduct(
        'product-uuid',
        { user: mockSupplierToken } as any,
        dto,
        [],
      );

      expect(result.price).toBe(29.99);
    });
  });

  describe('deleteProduct - Route Parameter Validation', () => {
    it('should pass correct ID parameter to service', async () => {
      service.deleteProduct.mockResolvedValue({
        message: 'Product deleted successfully',
        id: 'product-uuid',
      });

      await controller.deleteProduct('product-uuid', {
        user: mockSupplierToken,
      } as any);

      expect(service.deleteProduct).toHaveBeenCalledWith(
        'product-uuid',
        mockSupplierToken,
      );
    });

    it('should handle product ID in route parameter', async () => {
      service.deleteProduct.mockResolvedValue({
        message: 'Product deleted successfully',
        id: 'product-uuid',
      });

      const productId = '550e8400-e29b-41d4-a716-446655440000';

      await controller.deleteProduct(productId, {
        user: mockAdminToken,
      } as any);

      expect(service.deleteProduct).toHaveBeenCalledWith(
        productId,
        mockAdminToken,
      );
    });

    it('should return correct response structure on successful delete', async () => {
      service.deleteProduct.mockResolvedValue({
        message: 'Product deleted successfully',
        id: 'product-uuid',
      });

      const result = await controller.deleteProduct('product-uuid', {
        user: mockSupplierToken,
      } as any);

      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('id');
      expect(result.message).toBe('Product deleted successfully');
    });

    it('should pass user token for authorization check', async () => {
      service.deleteProduct.mockResolvedValue({
        message: 'Product deleted successfully',
        id: 'product-uuid',
      });

      await controller.deleteProduct('product-uuid', {
        user: mockSupplierToken,
      } as any);

      expect(service.deleteProduct).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          id: 'supplier-uuid',
          userType: UserType.SUPPLIER,
        }),
      );
    });
  });
});
