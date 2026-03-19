import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { CreateProductDto } from './dtos/create-product.dto';
import {
  CloudinaryService,
  MulterFile,
} from 'src/core/cloudinary/cloudinary.service';
import { UploadApiResponse } from 'cloudinary';
import { User } from 'src/domain/users/entities/user.entity';
import { ITokenPayload } from 'src/core/constants/interfaces/common';
import { UserType } from 'src/core/constants/app.constants';
import { Category } from 'src/domain/categories/entities/category.entity';
import { CategoriesService } from 'src/domain/categories/categories.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    private readonly cloudinaryService: CloudinaryService,
    private readonly categoriesService: CategoriesService,
    private readonly usersService: UsersService,
  ) {}

  async createProduct(
    user: ITokenPayload,
    dto: CreateProductDto,
    imageFile: MulterFile,
  ) {
    try {
      let supplierId = user.id;

      // 1. If Admin, They MUST provide a supplierId or it defaults to them (which might be wrong if they aren't a supplier)
      // Actually, if Admin, they should provide supplierId
      if (user.userType === UserType.ADMIN) {
        if (!dto.supplierId) {
          throw new BadRequestException(
            'Admin must provide a supplierId to create a product',
          );
        }
        // Validate that the provided supplierId is a real supplier
        const supplier = await this.usersService.findOne(dto.supplierId);
        if (!supplier || supplier.userType !== UserType.SUPPLIER) {
          throw new BadRequestException(
            'The provided supplierId does not belong to a valid supplier',
          );
        }
        supplierId = dto.supplierId;
      }
      // Validation: Name and Description should not be the same
      if (dto.name.toLowerCase() === dto.description.toLowerCase()) {
        throw new BadRequestException(
          'Product name and description cannot be the same',
        );
      }

      // Validation: Same supplier cannot add two products with the same name
      const existingProduct = await this.productsRepository.findOne({
        where: {
          name: dto.name,
          supplier: { id: supplierId },
        },
      });

      if (existingProduct) {
        throw new BadRequestException(
          `You already have a product named "${dto.name}"`,
        );
      }

      // Validation: Check if category exists
      await this.categoriesService.getAllCategoriesById(dto.categoryId);

      // Upload image to Cloudinary
      const uploadedImage = (await this.cloudinaryService.uploadImage(
        imageFile,
        'E-commerce',
      )) as UploadApiResponse;

      // Create and save the product
      const product = this.productsRepository.create({
        name: dto.name,
        description: dto.description,
        price: parseFloat(dto.price),
        image: uploadedImage.secure_url,
        supplier: { id: supplierId } as User,
        category: { id: dto.categoryId } as Category,
      });

      return await this.productsRepository.save(product);
    } catch (error) {
      console.error('Error creating product:', error);
      throw error;
    }
  }

  async getProducts(
    page: number,
    limit: number,
    search?: string,
    categoryId?: string,
    user?: ITokenPayload,
  ) {
    try {
      const skip = (page - 1) * limit;

      const query = this.productsRepository
        .createQueryBuilder('product')
        .leftJoinAndSelect('product.supplier', 'supplier')
        .leftJoinAndSelect('product.category', 'category')
        .orderBy('product.createdAt', 'DESC')
        .skip(skip)
        .take(limit);

      if (user && user.userType === UserType.SUPPLIER) {
        query.andWhere('supplier.id = :supplierId', {
          supplierId: user.id,
        });
      }

      if (categoryId) {
        query.andWhere('category.id = :categoryId', { categoryId });
      }

      if (search) {
        query.andWhere(
          new Brackets((qb) => {
            qb.where('product.name ILike :search', {
              search: `%${search}%`,
            })
              .orWhere('supplier.name ILike :search', {
                search: `%${search}%`,
              })
              .orWhere('CAST(product.price AS TEXT) ILike :search', {
                search: `%${search}%`,
              });
          }),
        );
      }

      const [items, totalItems] = await query.getManyAndCount();

      const totalPages = Math.ceil(totalItems / limit);

      return {
        data: items,
        totalItems,
        totalPages,
        currentPage: page,
      };
    } catch (error) {
      console.error(
        'Error getting products with search and pagination:',
        error,
      );
      throw error;
    }
  }
}
