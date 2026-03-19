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
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { AuthGuard } from 'src/core/guards/auth.guard';
import { Roles } from 'src/core/decorators/roles.decorator';
import { UserType } from 'src/core/constants/app.constants';
import { Public } from 'src/core/decorators/public.decorator';
import { CreateCategoryDto } from './dtos/create-category.dto';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

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

  @Post()
  @UseGuards(AuthGuard)
  @Roles(UserType.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new category' })
  @ApiBody({ type: CreateCategoryDto })
  async create(@Body() createCategoryDto: CreateCategoryDto) {
    return await this.categoriesService.createCategory(createCategoryDto);
  }
}
