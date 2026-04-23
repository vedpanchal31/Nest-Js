import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, CanActivate } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { UserType } from '../src/core/constants/app.constants';
import { ProductsController } from '../src/domain/products/products.controller';
import { ProductsService } from '../src/domain/products/products.service';
import { AuthGuard } from '../src/core/guards/auth.guard';
import { RoleGuard } from '../src/core/guards/role.guard';

describe('ProductsController (e2e)', () => {
  let app: INestApplication<App>;

  const mockProduct = {
    id: 'product-uuid',
    name: 'Wireless Mouse',
    description: 'A highly responsive wireless mouse.',
    price: 25.99,
    supplier: { id: 'supplier-uuid' },
    category: { id: 'category-uuid' },
    images: [{ id: 'image-uuid', url: 'http://image.url' }],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockProductsService = {
    createProduct: jest.fn().mockResolvedValue(mockProduct),
    getProducts: jest.fn().mockResolvedValue({
      data: [mockProduct],
      totalItems: 1,
      totalPages: 1,
      currentPage: 1,
    }),
    updateProduct: jest.fn().mockResolvedValue({
      ...mockProduct,
      name: 'Updated Mouse',
    }),
    deleteProduct: jest.fn().mockResolvedValue({
      message: 'Product deleted successfully',
      id: 'product-uuid',
    }),
  };

  const mockAuthGuard: CanActivate = {
    canActivate: jest.fn().mockImplementation((context) => {
      const req = context.switchToHttp().getRequest();
      req.user = {
        id: 'supplier-uuid',
        email: 'supplier@example.com',
        type: 2,
        userType: UserType.SUPPLIER,
      };
      return true;
    }),
  };

  const mockRoleGuard: CanActivate = {
    canActivate: jest.fn().mockReturnValue(true),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        {
          provide: ProductsService,
          useValue: mockProductsService,
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue(mockAuthGuard)
      .overrideGuard(RoleGuard)
      .useValue(mockRoleGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true }),
    );
    await app.init();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
    jest.clearAllMocks();
  });

  describe('POST /products', () => {
    it('should create product successfully with valid data', async () => {
      const createDto = {
        name: 'Wireless Mouse',
        description: 'A highly responsive wireless mouse.',
        price: '25.99',
        categoryId: '550e8400-e29b-41d4-a716-446655440001',
      };

      const response = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', 'Bearer mock-jwt-token')
        .field('name', createDto.name)
        .field('description', createDto.description)
        .field('price', createDto.price)
        .field('categoryId', createDto.categoryId)
        .attach('images', Buffer.from('fake-image-data'), 'test-image.jpg')
        .expect(201);

      expect(response.body).toBeDefined();
    });

    it('should return 400 when name is missing', async () => {
      await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', 'Bearer mock-jwt-token')
        .field('description', 'A highly responsive wireless mouse.')
        .field('price', '25.99')
        .field('categoryId', '550e8400-e29b-41d4-a716-446655440001')
        .attach('images', Buffer.from('fake-image-data'), 'test-image.jpg')
        .expect(400);
    });

    it('should return 400 when description is missing', async () => {
      await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', 'Bearer mock-jwt-token')
        .field('name', 'Wireless Mouse')
        .field('price', '25.99')
        .field('categoryId', '550e8400-e29b-41d4-a716-446655440001')
        .attach('images', Buffer.from('fake-image-data'), 'test-image.jpg')
        .expect(400);
    });

    it('should return 400 when price is missing', async () => {
      await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', 'Bearer mock-jwt-token')
        .field('name', 'Wireless Mouse')
        .field('description', 'A highly responsive wireless mouse.')
        .field('categoryId', '550e8400-e29b-41d4-a716-446655440001')
        .attach('images', Buffer.from('fake-image-data'), 'test-image.jpg')
        .expect(400);
    });

    it('should return 400 when categoryId is missing', async () => {
      await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', 'Bearer mock-jwt-token')
        .field('name', 'Wireless Mouse')
        .field('description', 'A highly responsive wireless mouse.')
        .field('price', '25.99')
        .attach('images', Buffer.from('fake-image-data'), 'test-image.jpg')
        .expect(400);
    });

    it('should return 400 when no images provided', async () => {
      await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', 'Bearer mock-jwt-token')
        .field('name', 'Wireless Mouse')
        .field('description', 'A highly responsive wireless mouse.')
        .field('price', '25.99')
        .field('categoryId', '550e8400-e29b-41d4-a716-446655440001')
        .expect(400);
    });

    it('should return 400 when categoryId is invalid UUID', async () => {
      await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', 'Bearer mock-jwt-token')
        .field('name', 'Wireless Mouse')
        .field('description', 'A highly responsive wireless mouse.')
        .field('price', '25.99')
        .field('categoryId', 'invalid-uuid')
        .attach('images', Buffer.from('fake-image-data'), 'test-image.jpg')
        .expect(400);
    });
  });

  describe('GET /products', () => {
    it('should return paginated products list', async () => {
      const response = await request(app.getHttpServer())
        .get('/products?page=1&limit=10')
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.totalItems).toBe(1);
      expect(response.body.totalPages).toBe(1);
      expect(response.body.currentPage).toBe(1);
    });

    it('should apply search filter', async () => {
      const response = await request(app.getHttpServer())
        .get('/products?page=1&limit=10&search=mouse')
        .expect(200);

      expect(response.body.data).toBeDefined();
    });

    it('should apply categoryId filter', async () => {
      const response = await request(app.getHttpServer())
        .get('/products?page=1&limit=10&categoryId=category-uuid')
        .expect(200);

      expect(response.body.data).toBeDefined();
    });

    it('should handle pagination with valid parameters', async () => {
      const response = await request(app.getHttpServer())
        .get('/products?page=2&limit=5')
        .expect(200);

      expect(response.body.data).toBeDefined();
    });
  });

  describe('PATCH /products/:id', () => {
    it('should update product successfully', async () => {
      const updateDto = {
        name: 'Updated Mouse',
        price: '29.99',
      };

      const response = await request(app.getHttpServer())
        .patch(`/products/${mockProduct.id}`)
        .set('Authorization', 'Bearer mock-jwt-token')
        .send(updateDto)
        .expect(200);

      expect(response.body.name).toBe('Updated Mouse');
    });

    it('should handle partial update with only name', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/products/${mockProduct.id}`)
        .set('Authorization', 'Bearer mock-jwt-token')
        .send({ name: 'Only Name Updated' })
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should handle update with any ID format (validation at service level)', async () => {
      const response = await request(app.getHttpServer())
        .patch('/products/any-id-format')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send({ name: 'Updated Name' })
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should return 400 for invalid price format', async () => {
      await request(app.getHttpServer())
        .patch(`/products/${mockProduct.id}`)
        .set('Authorization', 'Bearer mock-jwt-token')
        .send({ price: 'invalid-price' })
        .expect(400);
    });
  });

  describe('DELETE /products/:id', () => {
    it('should delete product successfully', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/products/${mockProduct.id}`)
        .set('Authorization', 'Bearer mock-jwt-token')
        .expect(200);

      expect(response.body.message).toBe('Product deleted successfully');
    });

    it('should handle delete with any ID format (validation at service level)', async () => {
      const response = await request(app.getHttpServer())
        .delete('/products/any-id-format')
        .set('Authorization', 'Bearer mock-jwt-token')
        .expect(200);

      expect(response.body.message).toBe('Product deleted successfully');
    });
  });
});
