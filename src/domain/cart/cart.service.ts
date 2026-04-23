import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CartItem } from './entities/cart-item.entity';
import { Repository } from 'typeorm';
import { Product } from '../products/entities/product.entity';
import { AddToCartDto, UpdateCartDto } from './dtos/cart.dto';
import { ProductsService } from '../products/products.service';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(CartItem)
    private readonly cartRepository: Repository<CartItem>,

    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,

    private readonly productsService: ProductsService,
  ) {}

  async getCart(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;

    const query = this.cartRepository.createQueryBuilder('cartItem');
    query.where('cartItem.user.id = :userId', { userId });
    query.leftJoinAndSelect('cartItem.product', 'product');
    query.orderBy('cartItem.createdAt', 'DESC');
    query.skip(skip);
    query.take(limit);

    const [items, totalItems] = await query.getManyAndCount();

    return {
      data: items,
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
      currentPage: page,
    };
  }

  async addToCart(userId: string, dto: AddToCartDto) {
    const product = await this.productRepository.findOne({
      where: { id: dto.productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Check stock availability
    await this.productsService.checkStockAvailability(
      dto.productId,
      dto.quantity,
    );

    let cartItem = await this.cartRepository.findOne({
      where: { user: { id: userId }, product: { id: dto.productId } },
    });

    if (cartItem) {
      const newQuantity = cartItem.quantity + dto.quantity;
      // Check stock availability for updated quantity
      await this.productsService.checkStockAvailability(
        dto.productId,
        newQuantity,
      );
      cartItem.quantity = newQuantity;
    } else {
      cartItem = this.cartRepository.create({
        user: { id: userId },
        product,
        quantity: dto.quantity,
      });
    }

    return await this.cartRepository.save(cartItem);
  }

  async updateCartQuantity(
    userId: string,
    cartItemId: string,
    dto: UpdateCartDto,
  ) {
    const cartItem = await this.cartRepository.findOne({
      where: { id: cartItemId, user: { id: userId } },
      relations: ['product'],
    });

    if (!cartItem) {
      throw new NotFoundException('Cart item not found');
    }

    // Check stock availability for updated quantity
    await this.productsService.checkStockAvailability(
      cartItem.product.id,
      dto.quantity,
    );

    cartItem.quantity = dto.quantity;
    return await this.cartRepository.save(cartItem);
  }

  async removeItem(userId: string, cartItemId: string) {
    const cartItem = await this.cartRepository.findOne({
      where: { id: cartItemId, user: { id: userId } },
    });

    if (!cartItem) {
      throw new NotFoundException('Cart item not found');
    }

    await this.cartRepository.remove(cartItem);
    return { message: 'Item removed successfully' };
  }

  async clearCart(userId: string) {
    return await this.cartRepository.delete({ user: { id: userId } });
  }
}
