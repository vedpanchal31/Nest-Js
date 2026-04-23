import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
  Patch,
  Delete,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  Res,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiBody,
  ApiQuery,
  ApiConsumes,
  ApiResponse,
} from '@nestjs/swagger';
import {
  FileInterceptor,
  FilesInterceptor,
  AnyFilesInterceptor,
} from '@nestjs/platform-express';
import type { Response } from 'express';
import { CategoriesService } from './categories.service';
import { AuthGuard } from 'src/core/guards/auth.guard';
import { RoleGuard } from 'src/core/guards/role.guard';
import { Roles } from 'src/core/decorators/roles.decorator';
import { RoutePermission } from 'src/core/decorators/route-permission.decorator';
import { UserType, PermissionType } from 'src/core/constants/app.constants';
import { Public } from 'src/core/decorators/public.decorator';
import { CreateCategoryDto } from './dtos/create-category.dto';
import { UpdateCategoryDto } from './dtos/update-category.dto';
import {
  BulkUploadService,
  ExcelColumn,
} from 'src/core/bulk-upload/bulk-upload.service';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(
    private readonly categoriesService: CategoriesService,
    private readonly bulkUploadService: BulkUploadService,
  ) {}

  @Get()
  @Public()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Get all categories with their products' })
  @ApiQuery({ name: 'page', required: true, default: 1 })
  @ApiQuery({ name: 'limit', required: true, default: 10 })
  @ApiQuery({ name: 'search', required: false })
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('search') search?: string,
  ) {
    return await this.categoriesService.getAllCategories(page, limit, search);
  }

  @Get(':id')
  @Public()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Get category by ID' })
  async findOne(@Param('id') id: string) {
    return await this.categoriesService.getAllCategoriesById(id);
  }

  @Get('bulk/sample')
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserType.ADMIN, UserType.SUBADMIN)
  @RoutePermission(PermissionType.CREATE_CATEGORY)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Download sample Excel file for bulk category upload',
  })
  async downloadSample(@Res() res: Response): Promise<void> {
    const columns: ExcelColumn[] = [
      { header: 'Name*', key: 'name', width: 30, required: true },
      { header: 'Description', key: 'description', width: 40 },
      { header: 'Image', key: 'image', width: 25 },
    ];

    const sampleData = [
      {
        name: 'Electronics',
        description: 'Electronic devices and gadgets',
        image: 'electronics.jpg',
      },
      {
        name: 'Clothing',
        description: 'Fashion and apparel',
        image: 'clothing.png',
      },
    ];

    return await this.bulkUploadService.generateSampleExcel(
      columns,
      sampleData,
      'categories_sample.xlsx',
      'Categories',
      res,
    );
  }

  @Post('bulk/upload')
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserType.ADMIN, UserType.SUBADMIN)
  @RoutePermission(PermissionType.CREATE_CATEGORY)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Bulk upload categories from Excel with images' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['excel', 'images'],
      properties: {
        excel: {
          type: 'string',
          format: 'binary',
          description: 'Excel file (.xlsx) containing category data',
        },
        images: {
          type: 'string',
          format: 'binary',
          description: 'ZIP file containing category images (required)',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Categories uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Validation errors' })
  @UseInterceptors(AnyFilesInterceptor())
  async bulkUpload(@UploadedFiles() files: Array<Express.Multer.File>) {
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

    return await this.categoriesService.bulkUploadCategories(
      excelFile.buffer,
      zipFile?.buffer,
    );
  }

  @Post()
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserType.ADMIN)
  @RoutePermission(PermissionType.CREATE_CATEGORY)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Create a new category with multiple images' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name'],
      properties: {
        name: {
          type: 'string',
          description: 'The name of the category',
        },
        description: {
          type: 'string',
          description: 'A brief description of the category',
        },
        images: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description: 'Category images to be uploaded (multiple allowed)',
        },
      },
    },
  })
  @UseInterceptors(FilesInterceptor('images', 10))
  async create(
    @Body() createCategoryDto: CreateCategoryDto,
    @UploadedFiles() imageFiles?: Array<Express.Multer.File>,
  ) {
    return await this.categoriesService.createCategory(
      createCategoryDto,
      imageFiles,
    );
  }

  @Patch(':id')
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserType.ADMIN, UserType.SUBADMIN)
  @RoutePermission(PermissionType.UPDATE_CATEGORY)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update a category' })
  @ApiBody({ type: UpdateCategoryDto })
  @UseInterceptors(FileInterceptor('image'))
  async update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
    @UploadedFile() imageFile?: Express.Multer.File,
  ) {
    return await this.categoriesService.updateCategory(
      id,
      updateCategoryDto,
      imageFile,
    );
  }

  @Delete(':id')
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserType.ADMIN)
  @RoutePermission(PermissionType.DELETE_CATEGORY)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a category' })
  async delete(@Param('id') id: string) {
    return await this.categoriesService.deleteCategory(id);
  }
}
