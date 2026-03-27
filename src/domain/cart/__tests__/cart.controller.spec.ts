import { Test, TestingModule } from '@nestjs/testing';
import { CartController } from '../cart.controller';
import { CartService } from '../cart.service';
import { UserType } from '../../../core/constants/app.constants';
import { AuthGuard } from '../../../core/guards/auth.guard';

jest.mock('../../../core/guards/auth.guard', () => ({
  AuthGuard: jest.fn().mockImplementation(() => ({
    canActivate: jest.fn().mockReturnValue(true),
  })),
}));

describe('CartController - Comprehensive', () => {
  let controller: CartController;
  let service: jest.Mocked<CartService>;

  const mockUserToken = {
    id: 'user-uuid',
    email: 'user@example.com',
    type: 1,
    userType: UserType.USER,
  };

  const mockCartItem = {
    id: 'cart-item-uuid',
    product: { id: 'product-uuid', name: 'Test Product', price: 99.99 },
    quantity: 2,
  };

  const mockCartService = {
    getCart: jest.fn().mockResolvedValue({
      data: [mockCartItem],
      totalItems: 1,
      totalPages: 1,
      currentPage: 1,
    }),
    addToCart: jest.fn().mockResolvedValue(mockCartItem),
    updateCartQuantity: jest.fn().mockResolvedValue({ ...mockCartItem, quantity: 5 }),
    removeItem: jest.fn().mockResolvedValue({ message: 'Item removed successfully' }),
    clearCart: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CartController],
      providers: [
        {
          provide: CartService,
          useValue: mockCartService,
        },
      ],
    }).compile();

    controller = module.get<CartController>(CartController);
    service = module.get(CartService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getCart - Query Parameter Validation', () => {
    it('should call service with default pagination values', async () => {
      await controller.getCart({ user: mockUserToken } as any, 1, 10);

      expect(service.getCart).toHaveBeenCalledWith('user-uuid', 1, 10);
    });

    it('should pass custom pagination values to service', async () => {
      await controller.getCart({ user: mockUserToken } as any, 2, 20);

      expect(service.getCart).toHaveBeenCalledWith('user-uuid', 2, 20);
    });

    it('should extract user id from token', async () => {
      await controller.getCart({ user: { id: 'different-user' } } as any, 1, 10);

      expect(service.getCart).toHaveBeenCalledWith('different-user', 1, 10);
    });

    it('should return paginated cart data', async () => {
      const result = await controller.getCart({ user: mockUserToken } as any, 1, 10);

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('totalItems');
      expect(result).toHaveProperty('totalPages');
      expect(result).toHaveProperty('currentPage');
    });
  });

  describe('addToCart - Request Body Validation', () => {
    it('should successfully add item to cart', async () => {
      const dto = { productId: 'product-uuid', quantity: 2 };

      const result = await controller.addToCart({ user: mockUserToken } as any, dto);

      expect(result).toEqual(mockCartItem);
      expect(service.addToCart).toHaveBeenCalledWith('user-uuid', dto);
    });

    it('should pass correct user id to service', async () => {
      const dto = { productId: 'product-uuid', quantity: 1 };

      await controller.addToCart({ user: { id: 'another-user' } } as any, dto);

      expect(service.addToCart).toHaveBeenCalledWith('another-user', dto);
    });

    it('should pass dto with productId to service', async () => {
      const dto = { productId: '550e8400-e29b-41d4-a716-446655440000', quantity: 3 };

      await controller.addToCart({ user: mockUserToken } as any, dto);

      expect(service.addToCart).toHaveBeenCalledWith(
        'user-uuid',
        expect.objectContaining({ productId: '550e8400-e29b-41d4-a716-446655440000' }),
      );
    });

    it('should pass dto with quantity to service', async () => {
      const dto = { productId: 'product-uuid', quantity: 5 };

      await controller.addToCart({ user: mockUserToken } as any, dto);

      expect(service.addToCart).toHaveBeenCalledWith(
        'user-uuid',
        expect.objectContaining({ quantity: 5 }),
      );
    });
  });

  describe('updateCartQuantity - Route Parameter and Body Validation', () => {
    it('should pass correct cart item id to service', async () => {
      const dto = { quantity: 5 };

      await controller.updateCartQuantity(
        { user: mockUserToken } as any,
        'cart-item-uuid',
        dto,
      );

      expect(service.updateCartQuantity).toHaveBeenCalledWith(
        'user-uuid',
        'cart-item-uuid',
        dto,
      );
    });

    it('should pass user id from token to service', async () => {
      const dto = { quantity: 3 };

      await controller.updateCartQuantity(
        { user: { id: 'specific-user' } } as any,
        'cart-item-uuid',
        dto,
      );

      expect(service.updateCartQuantity).toHaveBeenCalledWith(
        'specific-user',
        expect.any(String),
        expect.any(Object),
      );
    });

    it('should pass quantity dto to service', async () => {
      const dto = { quantity: 10 };

      await controller.updateCartQuantity(
        { user: mockUserToken } as any,
        'cart-item-uuid',
        dto,
      );

      expect(service.updateCartQuantity).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        { quantity: 10 },
      );
    });

    it('should return updated cart item', async () => {
      const dto = { quantity: 5 };

      const result = await controller.updateCartQuantity(
        { user: mockUserToken } as any,
        'cart-item-uuid',
        dto,
      );

      expect(result.quantity).toBe(5);
    });
  });

  describe('removeItem - Route Parameter Validation', () => {
    it('should pass correct cart item id to service', async () => {
      await controller.removeItem({ user: mockUserToken } as any, 'cart-item-uuid');

      expect(service.removeItem).toHaveBeenCalledWith('user-uuid', 'cart-item-uuid');
    });

    it('should pass user id from token for authorization', async () => {
      await controller.removeItem({ user: { id: 'auth-user' } } as any, 'item-id');

      expect(service.removeItem).toHaveBeenCalledWith('auth-user', 'item-id');
    });

    it('should return success message', async () => {
      const result = await controller.removeItem(
        { user: mockUserToken } as any,
        'cart-item-uuid',
      );

      expect(result).toEqual({ message: 'Item removed successfully' });
    });

    it('should handle any id format (validation at service level)', async () => {
      const customId = 'custom-cart-item-id';
      await controller.removeItem({ user: mockUserToken } as any, customId);

      expect(service.removeItem).toHaveBeenCalledWith('user-uuid', customId);
    });
  });

  describe('clearCart - User Authorization', () => {
    it('should clear cart for authenticated user', async () => {
      await controller.clearCart({ user: mockUserToken } as any);

      expect(service.clearCart).toHaveBeenCalledWith('user-uuid');
    });

    it('should pass user id from token', async () => {
      await controller.clearCart({ user: { id: 'clear-user' } } as any);

      expect(service.clearCart).toHaveBeenCalledWith('clear-user');
    });

    it('should return deletion result', async () => {
      const result = await controller.clearCart({ user: mockUserToken } as any);

      expect(result).toEqual({ affected: 1 });
    });
  });
});
