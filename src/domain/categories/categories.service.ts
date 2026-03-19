import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { CreateCategoryDto } from './dtos/create-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,
  ) {}

  async getAllCategories(page: number, limit: number, search?: string) {
    const skip = (page - 1) * limit;

    const query = this.categoriesRepository
      .createQueryBuilder('category')
      .leftJoinAndSelect('category.products', 'product')
      .orderBy('category.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (search) {
      query.andWhere(
        'category.name ILike :search OR category.description ILike :search',
        { search: `%${search}%` },
      );
    }

    const [items, totalItems] = await query.getManyAndCount();

    return {
      data: items,
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
      currentPage: page,
    };
  }

  async getAllCategoriesById(id: string) {
    const category = await this.categoriesRepository.findOne({
      where: { id },
      relations: ['products'],
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async createCategory(dto: CreateCategoryDto) {
    const existing = await this.categoriesRepository.findOne({
      where: { name: dto.name },
    });

    if (existing) {
      throw new BadRequestException(
        `Category with name "${dto.name}" already exists`,
      );
    }

    const category = this.categoriesRepository.create(dto);
    return await this.categoriesRepository.save(category);
  }
}
