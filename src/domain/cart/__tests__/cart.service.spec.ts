import { Test, TestingModule } from '@nestjs/testing';
import { CartService } from '../cart.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CartItem } from '../entities/cart-item.entity';
import { Product } from '../../products/entities/product.entity';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';

describe('CartService - Comprehensive', () => {
  let service: CartService;
  let cartRepository: jest.Mocked<Repository<CartItem>>;
  let productRepository: jest.Mocked<Repository<Product>>;

  const mockProduct = {
    id: 'product-uuid',
    name: 'Test Product',
    price: 99.99,
  } as Product;

  const mockCartItem = {
    id: 'cart-item-uuid',
    userId: 'user-uuid',
    productId: 'product-uuid',
    product: mockProduct,
    quantity: 2,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as CartItem;

  const mockCartRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn().mockReturnValue(mockCartItem),
    save: jest.fn().mockResolvedValue(mockCartItem),
    remove: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
    createQueryBuilder: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[mockCartItem], 1]),
    }),
  };

  const mockProductRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        {
          provide: getRepositoryToken(CartItem),
          useValue: mockCartRepository,
        },
        {
          provide: getRepositoryToken(Product),
          useValue: mockProductRepository,
        },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
    cartRepository = module.get(getRepositoryToken(CartItem));
    productRepository = module.get(getRepositoryToken(Product));
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCart - Pagination', () => {
    it('should return paginated cart items', async () => {
      const result = await service.getCart('user-uuid', 1, 10);

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('totalItems');
      expect(result).toHaveProperty('totalPages');
      expect(result).toHaveProperty('currentPage');
      expect(result.currentPage).toBe(1);
      expect(result.data).toHaveLength(1);
    });

    it('should filter by user id', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockCartItem], 1]),
      };
      cartRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await service.getCart('specific-user-id', 1, 10);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'cartItem.user.id = :userId',
        { userId: 'specific-user-id' },
      );
    });

    it('should calculate correct skip value for page 2', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockCartItem], 1]),
      };
      cartRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await service.getCart('user-uuid', 2, 10);

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(10);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
    });

    it('should include product relation', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockCartItem], 1]),
      };
      cartRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await service.getCart('user-uuid', 1, 10);

      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'cartItem.product',
        'product',
      );
    });
  });

  describe('addToCart - Business Logic', () => {
    it('should throw NotFoundException when product does not exist', async () => {
      productRepository.findOne.mockResolvedValue(null);

      const dto = { productId: 'non-existent-product', quantity: 1 };

      await expect(service.addToCart('user-uuid', dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should create new cart item when product not in cart', async () => {
      productRepository.findOne.mockResolvedValue(mockProduct);
      cartRepository.findOne.mockResolvedValue(null);

      const dto = { productId: 'product-uuid', quantity: 2 };

      const result = await service.addToCart('user-uuid', dto);

      expect(cartRepository.create).toHaveBeenCalledWith({
        user: { id: 'user-uuid' },
        product: mockProduct,
        quantity: 2,
      });
      expect(cartRepository.save).toHaveBeenCalled();
    });

    it('should increment quantity when product already in cart', async () => {
      productRepository.findOne.mockResolvedValue(mockProduct);
      const existingCartItem = { ...mockCartItem, quantity: 2 };
      cartRepository.findOne.mockResolvedValue(existingCartItem);
      const saveSpy = jest.fn().mockResolvedValue({ ...existingCartItem, quantity: 5 });
      cartRepository.save = saveSpy;

      const dto = { productId: 'product-uuid', quantity: 3 };

      await service.addToCart('user-uuid', dto);

      expect(saveSpy).toHaveBeenCalledWith(expect.objectContaining({ quantity: 5 }));
    });

    it('should find existing cart item by user and product id', async () => {
      productRepository.findOne.mockResolvedValue(mockProduct);
      cartRepository.findOne.mockResolvedValue(null);

      const dto = { productId: 'product-uuid', quantity: 1 };

      await service.addToCart('user-uuid', dto);

      expect(cartRepository.findOne).toHaveBeenCalledWith({
        where: {
          user: { id: 'user-uuid' },
          product: { id: 'product-uuid' },
        },
      });
    });
  });

  describe('updateCartQuantity - ID and Data Validation', () => {
    it('should throw NotFoundException when cart item not found', async () => {
      cartRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateCartQuantity('user-uuid', 'non-existent-id', { quantity: 3 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when cart item belongs to different user', async () => {
      cartRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateCartQuantity('different-user', 'cart-item-uuid', { quantity: 3 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update quantity when cart item exists', async () => {
      const existingItem = { ...mockCartItem, quantity: 1 };
      cartRepository.findOne.mockResolvedValue(existingItem);
      const saveSpy = jest.fn().mockResolvedValue({ ...existingItem, quantity: 5 });
      cartRepository.save = saveSpy;

      const result = await service.updateCartQuantity(
        'user-uuid',
        'cart-item-uuid',
        { quantity: 5 },
      );

      expect(saveSpy).toHaveBeenCalledWith(expect.objectContaining({ quantity: 5 }));
      expect(result.quantity).toBe(5);
    });

    it('should verify user ownership before update', async () => {
      cartRepository.findOne.mockResolvedValue(mockCartItem);

      await service.updateCartQuantity('user-uuid', 'cart-item-uuid', { quantity: 3 });

      expect(cartRepository.findOne).toHaveBeenCalledWith({
        where: {
          id: 'cart-item-uuid',
          user: { id: 'user-uuid' },
        },
      });
    });
  });

  describe('removeItem - ID and Authorization', () => {
    it('should throw NotFoundException when cart item not found', async () => {
      cartRepository.findOne.mockResolvedValue(null);

      await expect(
        service.removeItem('user-uuid', 'non-existent-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should remove item when found and belongs to user', async () => {
      cartRepository.findOne.mockResolvedValue(mockCartItem);

      const result = await service.removeItem('user-uuid', 'cart-item-uuid');

      expect(cartRepository.remove).toHaveBeenCalledWith(mockCartItem);
      expect(result).toEqual({ message: 'Item removed successfully' });
    });

    it('should verify user ownership before removal', async () => {
      cartRepository.findOne.mockResolvedValue(mockCartItem);

      await service.removeItem('user-uuid', 'cart-item-uuid');

      expect(cartRepository.findOne).toHaveBeenCalledWith({
        where: {
          id: 'cart-item-uuid',
          user: { id: 'user-uuid' },
        },
      });
    });
  });

  describe('clearCart - User Validation', () => {
    it('should delete all items for user', async () => {
      await service.clearCart('user-uuid');

      expect(cartRepository.delete).toHaveBeenCalledWith({
        user: { id: 'user-uuid' },
      });
    });

    it('should only delete items for specific user', async () => {
      const deleteSpy = jest.fn().mockResolvedValue({ affected: 3 });
      cartRepository.delete = deleteSpy;

      await service.clearCart('specific-user-id');

      expect(deleteSpy).toHaveBeenCalledWith({
        user: { id: 'specific-user-id' },
      });
    });
  });
});
