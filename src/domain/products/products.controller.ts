import {
  Body,
  Controller,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
  Get,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dtos/create-product.dto';
import { AuthGuard } from 'src/core/guards/auth.guard';
import { Roles } from 'src/core/decorators/roles.decorator';
import { Public } from 'src/core/decorators/public.decorator';
import { UserType } from 'src/core/constants/app.constants';
import type { MulterFile } from 'src/core/cloudinary/cloudinary.service';
import { ITokenPayload } from 'src/core/constants/interfaces/common';
import { Request } from 'express';
import { GetProductDto } from './dtos/get-product.dto';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @UseGuards(AuthGuard)
  @Roles(UserType.SUPPLIER, UserType.ADMIN)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('image'))
  @ApiOperation({ summary: 'Add a new product' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    type: CreateProductDto,
  })
  @ApiResponse({
    status: 201,
    description: 'Product created successfully',
  })
  async createProduct(
    @Req() req: Request & { user: ITokenPayload },
    @Body() createProductDto: CreateProductDto,
    @UploadedFile() image: MulterFile,
  ) {
    if (!image) {
      throw new BadRequestException('Product image is required');
    }

    // Pass the user ID, the data, and the file to the service
    return await this.productsService.createProduct(
      req.user,
      createProductDto,
      image,
    );
  }

  @Get()
  @Public()
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get All Product' })
  @ApiQuery({
    name: 'page',
    required: true,
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: true,
    example: 10,
  })
  @ApiQuery({
    name: 'search',
    required: false,
  })
  @ApiQuery({
    name: 'categoryId',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'List of all the products retrived successfully',
    type: [GetProductDto],
  })
  async getProducts(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('search') search: string,
    @Query('categoryId') categoryId: string,
    @Req() req: Request & { user?: ITokenPayload },
  ) {
    return this.productsService.getProducts(
      page,
      limit,
      search,
      categoryId,
      req.user,
    );
  }
}
