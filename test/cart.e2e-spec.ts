import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, CanActivate } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { UserType } from '../src/core/constants/app.constants';
import { CartController } from '../src/domain/cart/cart.controller';
import { CartService } from '../src/domain/cart/cart.service';
import { AuthGuard } from '../src/core/guards/auth.guard';

describe('CartController (e2e)', () => {
  let app: INestApplication<App>;

  const mockCartItem = {
    id: 'cart-item-uuid',
    product: { id: 'product-uuid', name: 'Test Product', price: 99.99 },
    quantity: 2,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCartService = {
    getCart: jest.fn().mockResolvedValue({
      data: [mockCartItem],
      totalItems: 1,
      totalPages: 1,
      currentPage: 1,
    }),
    addToCart: jest.fn().mockResolvedValue(mockCartItem),
    updateCartQuantity: jest.fn().mockResolvedValue({
      ...mockCartItem,
      quantity: 5,
    }),
    removeItem: jest
      .fn()
      .mockResolvedValue({ message: 'Item removed successfully' }),
    clearCart: jest.fn().mockResolvedValue({ affected: 2 }),
  };

  const mockAuthGuard: CanActivate = {
    canActivate: jest.fn().mockImplementation((context) => {
      const req = context.switchToHttp().getRequest();
      req.user = {
        id: 'user-uuid',
        email: 'user@example.com',
        type: 1,
        userType: UserType.USER,
      };
      return true;
    }),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [CartController],
      providers: [
        {
          provide: CartService,
          useValue: mockCartService,
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue(mockAuthGuard)
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

  describe('GET /cart', () => {
    it('should return paginated cart items', async () => {
      const response = await request(app.getHttpServer())
        .get('/cart?page=1&limit=10')
        .set('Authorization', 'Bearer mock-jwt-token')
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.totalItems).toBe(1);
      expect(response.body.totalPages).toBe(1);
      expect(response.body.currentPage).toBe(1);
    });

    it('should apply pagination parameters', async () => {
      await request(app.getHttpServer())
        .get('/cart?page=2&limit=5')
        .set('Authorization', 'Bearer mock-jwt-token')
        .expect(200);

      expect(mockCartService.getCart).toHaveBeenCalledWith('user-uuid', 2, 5);
    });

    it('should use default pagination values', async () => {
      await request(app.getHttpServer())
        .get('/cart')
        .set('Authorization', 'Bearer mock-jwt-token')
        .expect(200);

      expect(mockCartService.getCart).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Number),
        expect.any(Number),
      );
    });
  });

  describe('POST /cart', () => {
    it('should add item to cart successfully', async () => {
      const addDto = {
        productId: '550e8400-e29b-41d4-a716-446655440000',
        quantity: 2,
      };

      const response = await request(app.getHttpServer())
        .post('/cart')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send(addDto)
        .expect(201);

      expect(response.body).toBeDefined();
      expect(mockCartService.addToCart).toHaveBeenCalledWith(
        'user-uuid',
        addDto,
      );
    });

    it('should return 400 when productId is missing', async () => {
      await request(app.getHttpServer())
        .post('/cart')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send({ quantity: 2 })
        .expect(400);
    });

    it('should return 400 when quantity is missing', async () => {
      await request(app.getHttpServer())
        .post('/cart')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send({ productId: '550e8400-e29b-41d4-a716-446655440000' })
        .expect(400);
    });

    it('should return 400 when quantity is less than 1', async () => {
      await request(app.getHttpServer())
        .post('/cart')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send({
          productId: '550e8400-e29b-41d4-a716-446655440000',
          quantity: 0,
        })
        .expect(400);
    });

    it('should return 400 for invalid productId format', async () => {
      await request(app.getHttpServer())
        .post('/cart')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send({
          productId: 'invalid-uuid',
          quantity: 2,
        })
        .expect(400);
    });

    it('should return 400 when quantity is not an integer', async () => {
      await request(app.getHttpServer())
        .post('/cart')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send({
          productId: '550e8400-e29b-41d4-a716-446655440000',
          quantity: 1.5,
        })
        .expect(400);
    });
  });

  describe('PATCH /cart/:id', () => {
    it('should update cart item quantity successfully', async () => {
      const updateDto = { quantity: 5 };

      const response = await request(app.getHttpServer())
        .patch(`/cart/${mockCartItem.id}`)
        .set('Authorization', 'Bearer mock-jwt-token')
        .send(updateDto)
        .expect(200);

      expect(response.body.quantity).toBe(5);
    });

    it('should return 400 when quantity is missing', async () => {
      await request(app.getHttpServer())
        .patch(`/cart/${mockCartItem.id}`)
        .set('Authorization', 'Bearer mock-jwt-token')
        .send({})
        .expect(400);
    });

    it('should return 400 when quantity is less than 1', async () => {
      await request(app.getHttpServer())
        .patch(`/cart/${mockCartItem.id}`)
        .set('Authorization', 'Bearer mock-jwt-token')
        .send({ quantity: 0 })
        .expect(400);
    });

    it('should handle any cart item id format', async () => {
      const customId = 'custom-cart-item-id';
      await request(app.getHttpServer())
        .patch(`/cart/${customId}`)
        .set('Authorization', 'Bearer mock-jwt-token')
        .send({ quantity: 3 })
        .expect(200);

      expect(mockCartService.updateCartQuantity).toHaveBeenCalledWith(
        'user-uuid',
        customId,
        { quantity: 3 },
      );
    });
  });

  describe('DELETE /cart/:id', () => {
    it('should remove item from cart successfully', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/cart/${mockCartItem.id}`)
        .set('Authorization', 'Bearer mock-jwt-token')
        .expect(200);

      expect(response.body.message).toBe('Item removed successfully');
    });

    it('should handle any cart item id format', async () => {
      const customId = 'remove-item-id';
      await request(app.getHttpServer())
        .delete(`/cart/${customId}`)
        .set('Authorization', 'Bearer mock-jwt-token')
        .expect(200);

      expect(mockCartService.removeItem).toHaveBeenCalledWith(
        'user-uuid',
        customId,
      );
    });
  });

  describe('DELETE /cart', () => {
    it('should clear entire cart successfully', async () => {
      const response = await request(app.getHttpServer())
        .delete('/cart')
        .set('Authorization', 'Bearer mock-jwt-token')
        .expect(200);

      expect(response.body.affected).toBe(2);
    });

    it('should call clearCart with user id', async () => {
      await request(app.getHttpServer())
        .delete('/cart')
        .set('Authorization', 'Bearer mock-jwt-token')
        .expect(200);

      expect(mockCartService.clearCart).toHaveBeenCalledWith('user-uuid');
    });
  });
});
