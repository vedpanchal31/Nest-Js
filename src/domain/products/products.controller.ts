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
  Res,
} from '@nestjs/common';
import {
  FilesInterceptor,
  AnyFilesInterceptor,
} from '@nestjs/platform-express';
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
import { ITokenPayload } from 'src/core/constants/interfaces/common';
import type { Response } from 'express';
import { Request } from 'express';
import { GetProductDto } from './dtos/get-product.dto';
import { UpdateProductDto } from './dtos/update-product.dto';
import { UpdateStockDto } from './dtos/update-stock.dto';
import {
  BulkUploadService,
  ExcelColumn,
} from 'src/core/bulk-upload/bulk-upload.service';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly bulkUploadService: BulkUploadService,
  ) {}

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

  @Get('bulk/sample')
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserType.ADMIN, UserType.SUBADMIN, UserType.SUPPLIER)
  @RoutePermission(PermissionType.CREATE_PRODUCT)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Download sample Excel file for bulk product upload',
  })
  async downloadSample(
    @Req() req: Request & { user: ITokenPayload },
    @Res() res: Response,
  ): Promise<void> {
    // Get all categories and suppliers for dropdowns
    const categories = await this.productsService.getAllCategoryNames();
    const isAdmin = req.user.userType === UserType.ADMIN;
    let suppliers: string[] = [];
    if (isAdmin) {
      suppliers = await this.productsService.getAllSupplierNames();
    }

    // Column order: Category (1), Supplier (2 - admin only), Name, Description, Price, Images
    const columns: ExcelColumn[] = [
      {
        header: 'Category*',
        key: 'category',
        width: 25,
        required: true,
        dropdown: categories,
      },
    ];

    // Add Supplier column for ADMIN users (2nd column)
    if (isAdmin) {
      columns.push({
        header: 'Supplier*',
        key: 'supplier',
        width: 30,
        required: true,
        dropdown: suppliers,
      });
    }

    columns.push(
      { header: 'Name*', key: 'name', width: 30, required: true },
      { header: 'Description*', key: 'description', width: 50, required: true },
      { header: 'Price*', key: 'price', width: 15, required: true },
      { header: 'Images', key: 'images', width: 40 },
    );

    const sampleData = [
      {
        category: categories.length > 0 ? categories[0] : 'Electronics',
        ...(isAdmin && {
          supplier: suppliers.length > 0 ? suppliers[0] : 'Supplier Name',
        }),
        name: 'Wireless Mouse',
        description: 'A high-quality wireless mouse with ergonomic design',
        price: 29.99,
        images: 'mouse1.jpg, mouse2.jpg',
      },
      {
        category: categories.length > 0 ? categories[0] : 'Electronics',
        ...(isAdmin && {
          supplier: suppliers.length > 0 ? suppliers[0] : 'Supplier Name',
        }),
        name: 'Gaming Keyboard',
        description: 'RGB mechanical gaming keyboard with blue switches',
        price: 89.99,
        images: 'keyboard1.png',
      },
    ];

    return await this.bulkUploadService.generateSampleExcel(
      columns,
      sampleData,
      'products_sample.xlsx',
      'Products',
      res,
    );
  }

  @Post('bulk/upload')
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserType.ADMIN, UserType.SUBADMIN, UserType.SUPPLIER)
  @RoutePermission(PermissionType.CREATE_PRODUCT)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Bulk upload products from Excel with images' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['excel', 'images'],
      properties: {
        excel: {
          type: 'string',
          format: 'binary',
          description: 'Excel file (.xlsx) containing product data',
        },
        images: {
          type: 'string',
          format: 'binary',
          description: 'ZIP file containing product images (required)',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Products uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Validation errors' })
  @UseInterceptors(AnyFilesInterceptor())
  async bulkUpload(
    @Req() req: Request & { user: ITokenPayload },
    @UploadedFiles() files: Array<Express.Multer.File>,
  ) {
    const excelFile = files.find(
      (f) =>
        f.mimetype.includes('spreadsheet') || f.originalname.endsWith('.xlsx'),
    );
    const zipFile = files.find(
      (f) =>
        f.mimetype === 'application/zip' || f.originalname.endsWith('.zip'),
    );

    if (!excelFile) {
      throw new BadRequestException('Excel file is required');
    }

    return await this.productsService.bulkUploadProducts(
      req.user,
      excelFile.buffer,
      zipFile?.buffer,
    );
  }

  @Patch(':id/stock')
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserType.SUPPLIER, UserType.ADMIN)
  @RoutePermission(PermissionType.UPDATE_PRODUCT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update product stock' })
  @ApiResponse({
    status: 200,
    description: 'Product stock updated successfully',
  })
  async updateProductStock(
    @Param('id') id: string,
    @Req() req: Request & { user: ITokenPayload },
    @Body() updateStockDto: UpdateStockDto,
  ) {
    return this.productsService.updateProductStock(
      id,
      req.user,
      updateStockDto,
    );
  }

  @Get('stock/low')
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserType.SUPPLIER, UserType.ADMIN)
  @RoutePermission(PermissionType.CREATE_PRODUCT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get low stock products' })
  @ApiResponse({
    status: 200,
    description: 'Low stock products retrieved successfully',
  })
  async getLowStockProducts(@Req() req: Request & { user: ITokenPayload }) {
    const supplierId =
      req.user.userType === UserType.SUPPLIER ? req.user.id : undefined;
    return this.productsService.getLowStockProducts(supplierId);
  }

  @Post(':id/stock/increase')
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserType.SUPPLIER, UserType.ADMIN)
  @RoutePermission(PermissionType.UPDATE_PRODUCT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Increase product stock' })
  @ApiResponse({
    status: 200,
    description: 'Product stock increased successfully',
  })
  async increaseStock(
    @Param('id') id: string,
    @Req() req: Request & { user: ITokenPayload },
    @Body('quantity') quantity: number,
  ) {
    return this.productsService.increaseStock(id, quantity);
  }

  @Post(':id/stock/decrease')
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserType.SUPPLIER, UserType.ADMIN)
  @RoutePermission(PermissionType.UPDATE_PRODUCT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Decrease product stock' })
  @ApiResponse({
    status: 200,
    description: 'Product stock decreased successfully',
  })
  async decreaseStock(
    @Param('id') id: string,
    @Req() req: Request & { user: ITokenPayload },
    @Body('quantity') quantity: number,
  ) {
    return this.productsService.decreaseStock(id, quantity);
  }
}
