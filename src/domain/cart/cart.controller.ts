import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { UserType } from 'src/core/constants/app.constants';
import { Roles } from 'src/core/decorators/roles.decorator';
import { ITokenPayload } from 'src/core/constants/interfaces/common';
import { AuthGuard } from 'src/core/guards/auth.guard';
import { AddToCartDto, UpdateCartDto } from './dtos/cart.dto';

@ApiTags('Cart')
@ApiBearerAuth()
@Roles(UserType.USER)
@UseGuards(AuthGuard)
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Get Cart' })
  @ApiQuery({ name: 'page', type: 'number', required: true, default: 1 })
  @ApiQuery({ name: 'limit', type: 'number', required: true, default: 10 })
  async getCart(
    @Req() req: { user: ITokenPayload },
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return await this.cartService.getCart(req.user.id, page, limit);
  }

  @Post()
  @ApiOperation({ summary: 'Add product to cart' })
  async addToCart(
    @Req() req: { user: ITokenPayload },
    @Body() dto: AddToCartDto,
  ) {
    return await this.cartService.addToCart(req.user.id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update item quantity in cart' })
  async updateCartQuantity(
    @Req() req: { user: ITokenPayload },
    @Param('id') id: string,
    @Body() dto: UpdateCartDto,
  ) {
    return await this.cartService.updateCartQuantity(req.user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove item from cart' })
  async removeItem(
    @Req() req: { user: ITokenPayload },
    @Param('id') id: string,
  ) {
    return await this.cartService.removeItem(req.user.id, id);
  }

  @Delete()
  @ApiOperation({ summary: 'Clear entire cart' })
  async clearCart(@Req() req: { user: ITokenPayload }) {
    return await this.cartService.clearCart(req.user.id);
  }
}
