import {
  Body,
  Controller,
  Post,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  BadRequestException,
  Get,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
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
import { RoleGuard } from 'src/core/guards/role.guard';
import { Roles } from 'src/core/decorators/roles.decorator';
import { RoutePermission } from 'src/core/decorators/route-permission.decorator';
import { Public } from 'src/core/decorators/public.decorator';
import { UserType, PermissionType } from 'src/core/constants/app.constants';
import type { MulterFile } from 'src/core/cloudinary/cloudinary.service';
import { ITokenPayload } from 'src/core/constants/interfaces/common';
import { Request } from 'express';
import { GetProductDto } from './dtos/get-product.dto';
import { UpdateProductDto } from './dtos/update-product.dto';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) { }

  @Post()
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserType.SUPPLIER, UserType.ADMIN)
  @RoutePermission(PermissionType.CREATE_PRODUCT)
  @ApiBearerAuth()
  @UseInterceptors(FilesInterceptor('images', 10))
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
    @UploadedFiles() images: Express.Multer.File[],
  ) {
    if (!images || images.length === 0) {
      throw new BadRequestException('At least one product image is required');
    }

    // Pass the user ID, the data, and the files to the service
    return await this.productsService.createProduct(
      req.user,
      createProductDto,
      images,
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

  @Patch(':id')
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserType.SUPPLIER, UserType.ADMIN)
  @RoutePermission(PermissionType.UPDATE_PRODUCT)
  @ApiBearerAuth()
  @UseInterceptors(FilesInterceptor('images', 10))
  @ApiOperation({ summary: 'Update an existing product' })
  @ApiConsumes('multipart/form-data')
  async updateProduct(
    @Param('id') id: string,
    @Req() req: Request & { user: ITokenPayload },
    @Body() updateProductDto: UpdateProductDto,
    @UploadedFiles() images: Express.Multer.File[],
  ) {
    return this.productsService.updateProduct(
      id,
      req.user,
      updateProductDto,
      images,
    );
  }

  @Delete(':id')
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserType.SUPPLIER, UserType.ADMIN)
  @RoutePermission(PermissionType.DELETE_PRODUCT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a product' })
  @ApiResponse({
    status: 200,
    description: 'Product deleted successfully',
  })
  async deleteProduct(
    @Param('id') id: string,
    @Req() req: Request & { user: ITokenPayload },
  ) {
    return this.productsService.deleteProduct(id, req.user);
  }
}
