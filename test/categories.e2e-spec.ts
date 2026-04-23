import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, CanActivate } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { UserType } from '../src/core/constants/app.constants';
import { CategoriesController } from '../src/domain/categories/categories.controller';
import { CategoriesService } from '../src/domain/categories/categories.service';
import { AuthGuard } from '../src/core/guards/auth.guard';
import { RoleGuard } from '../src/core/guards/role.guard';

describe('CategoriesController (e2e)', () => {
  let app: INestApplication<App>;

  const mockCategory = {
    id: 'category-uuid',
    name: 'Electronics',
    description: 'Electronic devices and gadgets',
    image: 'http://image.url/category.jpg',
    products: [],
    createdAt: new Date(),
    updatedAt: new Date(),
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
    updateCategory: jest.fn().mockResolvedValue({
      ...mockCategory,
      name: 'Updated Electronics',
    }),
    deleteCategory: jest.fn().mockResolvedValue(mockCategory),
  };

  const mockAuthGuard: CanActivate = {
    canActivate: jest.fn().mockImplementation((context) => {
      const req = context.switchToHttp().getRequest();
      req.user = {
        id: 'admin-uuid',
        email: 'admin@example.com',
        type: 2,
        userType: UserType.ADMIN,
      };
      return true;
    }),
  };

  const mockRoleGuard: CanActivate = {
    canActivate: jest.fn().mockReturnValue(true),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [CategoriesController],
      providers: [
        {
          provide: CategoriesService,
          useValue: mockCategoriesService,
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

  describe('GET /categories', () => {
    it('should return paginated categories list', async () => {
      const response = await request(app.getHttpServer())
        .get('/categories?page=1&limit=10')
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.totalItems).toBe(1);
      expect(response.body.totalPages).toBe(1);
      expect(response.body.currentPage).toBe(1);
    });

    it('should apply search filter', async () => {
      const response = await request(app.getHttpServer())
        .get('/categories?page=1&limit=10&search=electronics')
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(mockCategoriesService.getAllCategories).toHaveBeenCalledWith(
        1,
        10,
        'electronics',
      );
    });

    it('should handle pagination parameters', async () => {
      const response = await request(app.getHttpServer())
        .get('/categories?page=2&limit=5')
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(mockCategoriesService.getAllCategories).toHaveBeenCalledWith(
        2,
        5,
        undefined,
      );
    });
  });

  describe('GET /categories/:id', () => {
    it('should return category by id', async () => {
      const response = await request(app.getHttpServer())
        .get(`/categories/${mockCategory.id}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', 'category-uuid');
      expect(response.body).toHaveProperty('name', 'Electronics');
      expect(response.body).toHaveProperty(
        'description',
        'Electronic devices and gadgets',
      );
    });

    it('should handle any id format', async () => {
      const customId = '550e8400-e29b-41d4-a716-446655440000';
      await request(app.getHttpServer())
        .get(`/categories/${customId}`)
        .expect(200);

      expect(mockCategoriesService.getAllCategoriesById).toHaveBeenCalledWith(
        customId,
      );
    });
  });

  describe('POST /categories', () => {
    it('should create category successfully with valid data', async () => {
      const createDto = {
        name: 'New Category',
        description: 'New category description',
      };

      const response = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', 'Bearer mock-jwt-token')
        .field('name', createDto.name)
        .field('description', createDto.description)
        .attach('image', Buffer.from('fake-image-data'), 'test-image.jpg')
        .expect(201);

      expect(response.body).toBeDefined();
    });

    it('should return 400 when name is missing', async () => {
      await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', 'Bearer mock-jwt-token')
        .field('description', 'Description without name')
        .attach('image', Buffer.from('fake-image-data'), 'test-image.jpg')
        .expect(400);
    });

    it('should create category without image', async () => {
      const createDto = {
        name: 'Category Without Image',
        description: 'Description',
      };

      const response = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', 'Bearer mock-jwt-token')
        .field('name', createDto.name)
        .field('description', createDto.description)
        .expect(201);

      expect(response.body).toBeDefined();
    });
  });

  describe('PATCH /categories/:id', () => {
    it('should update category successfully', async () => {
      const updateDto = {
        name: 'Updated Electronics',
        description: 'Updated description',
      };

      const response = await request(app.getHttpServer())
        .patch(`/categories/${mockCategory.id}`)
        .set('Authorization', 'Bearer mock-jwt-token')
        .field('name', updateDto.name)
        .field('description', updateDto.description)
        .attach('image', Buffer.from('fake-image-data'), 'updated-image.jpg')
        .expect(200);

      expect(response.body.name).toBe('Updated Electronics');
    });

    it('should handle partial update with only name', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/categories/${mockCategory.id}`)
        .set('Authorization', 'Bearer mock-jwt-token')
        .field('name', 'Only Name Updated')
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should handle any id format', async () => {
      const customId = 'custom-update-id';
      await request(app.getHttpServer())
        .patch(`/categories/${customId}`)
        .set('Authorization', 'Bearer mock-jwt-token')
        .field('name', 'Updated Name')
        .expect(200);

      expect(mockCategoriesService.updateCategory).toHaveBeenCalledWith(
        customId,
        expect.any(Object),
        undefined,
      );
    });
  });

  describe('DELETE /categories/:id', () => {
    it('should delete category successfully', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/categories/${mockCategory.id}`)
        .set('Authorization', 'Bearer mock-jwt-token')
        .expect(200);

      expect(response.body).toHaveProperty('id', 'category-uuid');
      expect(response.body).toHaveProperty('name', 'Electronics');
    });

    it('should handle any id format', async () => {
      const customId = 'custom-delete-id';
      await request(app.getHttpServer())
        .delete(`/categories/${customId}`)
        .set('Authorization', 'Bearer mock-jwt-token')
        .expect(200);

      expect(mockCategoriesService.deleteCategory).toHaveBeenCalledWith(
        customId,
      );
    });
  });
});
