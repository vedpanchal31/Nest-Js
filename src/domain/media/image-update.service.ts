import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../products/entities/product.entity';
import { ProductImage } from '../products/entities/product-image.entity';
import { Category } from '../categories/entities/category.entity';
import { CategoryImage } from '../categories/entities/category-image.entity';
import { CloudinaryService } from '../../core/cloudinary/cloudinary.service';
import {
  UpdateImageDto,
  EntityType,
  SingleImageUploadDto,
} from './dtos/update-image.dto';
import { ITokenPayload } from '../../core/constants/interfaces/common';
import { UserType } from '../../core/constants/app.constants';

@Injectable()
export class ImageUpdateService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductImage)
    private readonly productImageRepository: Repository<ProductImage>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(CategoryImage)
    private readonly categoryImageRepository: Repository<CategoryImage>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async updateImages(
    user: ITokenPayload,
    dto: UpdateImageDto,
  ): Promise<{ message: string; images: any[] }> {
    // Validate entity exists and user has permission
    await this.validateEntityAndPermission(dto.entityType, dto.entityId, user);

    // Delete specified existing images
    if (dto.deleteImageIds && dto.deleteImageIds.length > 0) {
      await this.deleteImages(dto.entityType, dto.deleteImageIds);
    }

    // Upload new images
    const uploadedImages: any[] = [];
    if (dto.images && dto.images.length > 0) {
      for (const imageFile of dto.images) {
        const uploadedImage = await this.uploadAndSaveImage(
          dto.entityType,
          dto.entityId,
          imageFile,
        );
        uploadedImages.push(uploadedImage);
      }
    }

    return {
      message: 'Images updated successfully',
      images: uploadedImages,
    };
  }

  async addSingleImage(
    user: ITokenPayload,
    dto: SingleImageUploadDto,
    file: Express.Multer.File,
  ): Promise<{ message: string; image: any }> {
    // Validate entity exists and user has permission
    await this.validateEntityAndPermission(dto.entityType, dto.entityId, user);

    // Upload and save the image
    const uploadedImage = await this.uploadAndSaveImage(
      dto.entityType,
      dto.entityId,
      file,
    );

    return {
      message: 'Image added successfully',
      image: uploadedImage,
    };
  }

  async deleteImages(
    entityType: EntityType,
    imageIds: string[],
    user?: ITokenPayload,
  ): Promise<{ message: string }> {
    if (imageIds.length === 0) {
      throw new BadRequestException('No image IDs provided for deletion');
    }

    // Validate each image exists and belongs to the correct entity
    for (const imageId of imageIds) {
      const image = await this.getImageById(entityType, imageId);
      if (!image) {
        throw new NotFoundException(`Image with ID ${imageId} not found`);
      }

      // If user is provided, validate permission
      if (user) {
        await this.validateEntityAndPermission(
          entityType,
          this.getEntityIdFromImage(entityType, image),
          user,
        );
      }

      // Delete from Cloudinary
      const publicId = this.extractPublicIdFromUrl(image.url);
      if (publicId) {
        try {
          await this.cloudinaryService.deleteFile(publicId);
        } catch (error) {
          console.warn(
            `Failed to delete image from Cloudinary: ${error.message}`,
          );
        }
      }

      // Delete from database
      if (entityType === EntityType.PRODUCT) {
        await this.productImageRepository.delete(imageId);
      } else {
        await this.categoryImageRepository.delete(imageId);
      }
    }

    return {
      message: `${imageIds.length} image(s) deleted successfully`,
    };
  }

  async getEntityImages(
    entityType: EntityType,
    entityId: string,
    user?: ITokenPayload,
  ): Promise<any[]> {
    // Validate entity exists and user has permission
    if (user) {
      await this.validateEntityAndPermission(entityType, entityId, user);
    } else {
      await this.validateEntityExists(entityType, entityId);
    }

    // Get images based on entity type
    if (entityType === EntityType.PRODUCT) {
      return await this.productImageRepository.find({
        where: { product: { id: entityId } },
        order: { createdAt: 'ASC' },
      });
    } else {
      return await this.categoryImageRepository.find({
        where: { category: { id: entityId } },
        order: { createdAt: 'ASC' },
      });
    }
  }

  private async validateEntityAndPermission(
    entityType: EntityType,
    entityId: string,
    user: ITokenPayload,
  ): Promise<Product | Category> {
    const entity = await this.validateEntityExists(entityType, entityId);

    // Check permission based on user type and entity type
    if (entityType === EntityType.PRODUCT) {
      const product = entity as Product;

      // Admin and SubAdmin can manage any product images
      if (
        user.userType === UserType.ADMIN ||
        user.userType === UserType.SUBADMIN
      ) {
        return product;
      }

      // Supplier can only manage their own product images
      if (
        user.userType === UserType.SUPPLIER &&
        product.supplierId !== user.id
      ) {
        throw new ForbiddenException(
          'You can only manage images for your own products',
        );
      }
    } else {
      // Only Admin and SubAdmin can manage category images
      if (
        user.userType !== UserType.ADMIN &&
        user.userType !== UserType.SUBADMIN
      ) {
        throw new ForbiddenException(
          'Only Admin and SubAdmin can manage category images',
        );
      }
    }

    return entity;
  }

  private async validateEntityExists(
    entityType: EntityType,
    entityId: string,
  ): Promise<Product | Category> {
    let entity: Product | Category | null;

    if (entityType === EntityType.PRODUCT) {
      entity = await this.productRepository.findOne({
        where: { id: entityId },
        relations: ['supplier'],
      });
    } else {
      entity = await this.categoryRepository.findOne({
        where: { id: entityId },
      });
    }

    if (!entity) {
      const entityName =
        entityType === EntityType.PRODUCT ? 'Product' : 'Category';
      throw new NotFoundException(
        `${entityName} with ID ${entityId} not found`,
      );
    }

    return entity;
  }

  private async uploadAndSaveImage(
    entityType: EntityType,
    entityId: string,
    imageFile: Express.Multer.File,
  ): Promise<ProductImage | CategoryImage> {
    // Upload to Cloudinary
    const folder = `e-commerce/${entityType}s/${entityId}`;
    const uploadedImage = await this.cloudinaryService.uploadImage(
      imageFile,
      folder,
    );

    if ('error' in uploadedImage) {
      throw new BadRequestException(
        `Failed to upload image: ${uploadedImage.error.message}`,
      );
    }

    // Save to database
    if (entityType === EntityType.PRODUCT) {
      const productImage = this.productImageRepository.create({
        url: uploadedImage.secure_url,
        product: { id: entityId } as Product,
      });
      return await this.productImageRepository.save(productImage);
    } else {
      const categoryImage = this.categoryImageRepository.create({
        url: uploadedImage.secure_url,
        category: { id: entityId } as Category,
      });
      return await this.categoryImageRepository.save(categoryImage);
    }
  }

  private async getImageById(
    entityType: EntityType,
    imageId: string,
  ): Promise<ProductImage | CategoryImage | null> {
    if (entityType === EntityType.PRODUCT) {
      return await this.productImageRepository.findOne({
        where: { id: imageId },
        relations: ['product'],
      });
    } else {
      return await this.categoryImageRepository.findOne({
        where: { id: imageId },
        relations: ['category'],
      });
    }
  }

  private getEntityIdFromImage(
    entityType: EntityType,
    image: ProductImage | CategoryImage,
  ): string {
    if (entityType === EntityType.PRODUCT) {
      const productImage = image as ProductImage;
      return productImage.product.id;
    } else {
      const categoryImage = image as CategoryImage;
      return categoryImage.category.id;
    }
  }

  private extractPublicIdFromUrl(url: string): string | null {
    if (!url) return null;

    // Extract public ID from Cloudinary URL
    // Example: https://res.cloudinary.com/cloud-name/image/upload/v1234567890/folder/public-id.jpg
    const matches = url.match(/\/upload\/v\d+\/(.+?)(?:\.[^.]+)?$/);
    return matches ? matches[1] : null;
  }
}
