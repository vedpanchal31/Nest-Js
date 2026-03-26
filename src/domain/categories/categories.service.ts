import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UploadApiResponse } from 'cloudinary';
import { Category } from './entities/category.entity';
import { CreateCategoryDto } from './dtos/create-category.dto';
import { UpdateCategoryDto } from './dtos/update-category.dto';
import { CloudinaryService } from 'src/core/cloudinary/cloudinary.service';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,
    private readonly cloudinaryService: CloudinaryService,
  ) { }

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

  async createCategory(dto: CreateCategoryDto, imageFile?: Express.Multer.File) {
    const existing = await this.categoriesRepository.findOne({
      where: { name: dto.name },
    });

    if (existing) {
      throw new BadRequestException(
        `Category with name "${dto.name}" already exists`,
      );
    }

    // Upload image to Cloudinary if provided
    let imageUrl: string | null = null;
    if (imageFile) {
      const uploadedImage = (await this.cloudinaryService.uploadImage(
        imageFile,
        'E-commerce',
      )) as UploadApiResponse;
      imageUrl = uploadedImage.secure_url;
    }

    const categoryData: any = { ...dto };
    if (imageUrl) {
      categoryData.image = imageUrl;
    }

    const category = this.categoriesRepository.create(categoryData);
    return await this.categoriesRepository.save(category);
  }

  async updateCategory(id: string, dto: UpdateCategoryDto, imageFile?: Express.Multer.File) {
    const category = await this.categoriesRepository.findOne({
      where: { id },
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    if (dto.name) {
      category.name = dto.name;
    }
    if (dto.description) {
      category.description = dto.description;
    }

    // Upload new image if provided
    if (imageFile) {
      const uploadedImage = (await this.cloudinaryService.uploadImage(
        imageFile,
        'E-commerce',
      )) as UploadApiResponse;
      category.image = uploadedImage.secure_url;
    }

    return await this.categoriesRepository.save(category);
  }

  async deleteCategory(id: string) {
    const category = await this.categoriesRepository.findOne({
      where: { id },
      relations: ['products'],
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    if (category.products && category.products.length > 0) {
      throw new BadRequestException(
        'Cannot delete category because it has associated products. Please delete or reassign the products first',
      );
    }
    return await this.categoriesRepository.softRemove(category);
  }
}
