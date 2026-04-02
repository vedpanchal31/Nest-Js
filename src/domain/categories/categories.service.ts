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
import { BulkUploadService, BulkUploadResult, ParsedRow } from 'src/core/bulk-upload/bulk-upload.service';
import { CategoryImage } from './entities/category-image.entity';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,
    @InjectRepository(CategoryImage)
    private readonly categoryImageRepository: Repository<CategoryImage>,
    private readonly cloudinaryService: CloudinaryService,
    private readonly bulkUploadService: BulkUploadService,
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

  async createCategory(dto: CreateCategoryDto, imageFiles?: Express.Multer.File[]) {
    const existing = await this.categoriesRepository.findOne({
      where: { name: dto.name },
    });

    if (existing) {
      throw new BadRequestException(
        `Category with name "${dto.name}" already exists`,
      );
    }

    // Create category first
    const category = this.categoriesRepository.create(dto);
    const savedCategory = await this.categoriesRepository.save(category);

    // Upload images to Cloudinary if provided and save to CategoryImage
    if (imageFiles && imageFiles.length > 0) {
      for (const imageFile of imageFiles) {
        const uploadedImage = (await this.cloudinaryService.uploadImage(
          imageFile,
          'E-commerce',
        )) as UploadApiResponse;

        const categoryImage = this.categoryImageRepository.create({
          url: uploadedImage.secure_url,
          category: { id: savedCategory.id } as Category,
        });
        await this.categoryImageRepository.save(categoryImage);
      }
    }

    // Return category with images
    return await this.categoriesRepository.findOne({
      where: { id: savedCategory.id },
      relations: ['images'],
    });
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

      // Create and save category image
      const categoryImage = this.categoryImageRepository.create({
        url: uploadedImage.secure_url,
        category: { id: category.id } as Category,
      });
      await this.categoryImageRepository.save(categoryImage);
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

  async bulkUploadCategories(
    excelBuffer: Buffer,
    zipBuffer?: Buffer,
  ): Promise<BulkUploadResult<Category>> {
    const expectedColumns = ['Name*', 'Description', 'Image'];
    const requiredFields = ['Name*'];

    // Parse Excel file
    let rows: ParsedRow[];
    try {
      rows = await this.bulkUploadService.parseExcelFile(excelBuffer, expectedColumns);
    } catch (error) {
      throw new BadRequestException(
        `Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }

    if (rows.length === 0) {
      throw new BadRequestException('Excel file contains no valid data rows');
    }

    // Extract images from ZIP if provided
    const zipImages = zipBuffer
      ? this.bulkUploadService.extractImagesFromZip(zipBuffer)
      : new Map<string, Buffer>();

    const errors: Array<{ row: number; column: string; field: string; value: unknown; message: string }> = [];

    // Create column mapping
    const columnMap: Record<string, string> = {};
    expectedColumns.forEach((col, index) => {
      columnMap[col] = String.fromCharCode(65 + index);
    });

    // First pass: Validate all rows
    const validRows: Array<{
      rowNumber: number;
      name: string;
      description: string;
      imageNames: string[];
    }> = [];

    for (const row of rows) {
      let hasRowError = false;

      // Validate required fields
      const rowErrors = this.bulkUploadService.validateRequiredFields(row, requiredFields);
      if (rowErrors.length > 0) {
        rowErrors.forEach((err) => {
          errors.push({
            row: err.row,
            column: columnMap[err.field] || '-',
            field: err.field,
            value: err.value,
            message: err.message,
          });
        });
        hasRowError = true;
      }

      const name = String(row.data['Name*'] || '').trim();
      const description = row.data['Description']
        ? String(row.data['Description']).trim()
        : '';
      const imagesRaw = row.data['Image'] ? String(row.data['Image']).trim() : '';

      // Parse image names (comma-separated like products)
      const imageNames = imagesRaw
        .split(',')
        .map((n) => n.trim())
        .filter((n) => n.length > 0);

      // Check if category already exists
      if (name) {
        const existingCategory = await this.categoriesRepository.findOne({
          where: { name: name },
        });

        if (existingCategory) {
          errors.push({
            row: row.rowNumber,
            column: columnMap['Name*'],
            field: 'Name*',
            value: name,
            message: `Category with name "${name}" already exists`,
          });
          hasRowError = true;
        }
      }

      // Validate all images exist in ZIP if specified
      if (imageNames.length > 0) {
        const { unmatched } = this.bulkUploadService.matchImages(imageNames, zipImages);
        for (const unmatchedName of unmatched) {
          errors.push({
            row: row.rowNumber,
            column: columnMap['Image'] || '-',
            field: 'Image',
            value: unmatchedName,
            message: `Image "${unmatchedName}" not found in ZIP file`,
          });
          hasRowError = true;
        }
      }

      if (!hasRowError) {
        validRows.push({
          rowNumber: row.rowNumber,
          name,
          description,
          imageNames,
        });
      }
    }

    // If any errors, return without creating
    if (errors.length > 0) {
      return {
        success: false,
        message: 'Failed to create categories. Please fix the errors and try again.',
        totalRows: rows.length,
        successCount: 0,
        errorCount: errors.length,
        errors,
        data: [],
      };
    }

    // Second pass: Create all categories
    const createdCategories: Category[] = [];

    for (const validRow of validRows) {
      // Create category first
      try {
        const category = this.categoriesRepository.create({
          name: validRow.name,
          description: validRow.description,
        });
        const savedCategory = await this.categoriesRepository.save(category);

        // Upload ALL images if provided (like Products)
        if (validRow.imageNames.length > 0) {
          const { matched } = this.bulkUploadService.matchImages(validRow.imageNames, zipImages);

          for (const [imageName, imageBuffer] of matched) {
            try {
              const mockFile: Express.Multer.File = {
                fieldname: 'image',
                originalname: imageName,
                encoding: '7bit',
                mimetype: `image/${imageName.split('.').pop() || 'jpeg'}`,
                buffer: imageBuffer,
                size: imageBuffer.length,
                stream: null as unknown as Express.Multer.File['stream'],
                destination: '',
                filename: imageName,
                path: '',
              };

              const uploadedImage = (await this.cloudinaryService.uploadImage(
                mockFile,
                'E-commerce',
              )) as UploadApiResponse;

              const categoryImage = this.categoryImageRepository.create({
                url: uploadedImage.secure_url,
                category: { id: savedCategory.id } as Category,
              });

              await this.categoryImageRepository.save(categoryImage);
            } catch (uploadError) {
              console.error(`Failed to upload image ${imageName}:`, uploadError);
            }
          }
        }

        createdCategories.push(savedCategory);
      } catch (saveError) {
        errors.push({
          row: validRow.rowNumber,
          column: '-',
          field: 'Name*',
          value: validRow.name,
          message: `Failed to create category: ${saveError instanceof Error ? saveError.message : 'Unknown error'}`,
        });
      }
    }

    // Load categories with their images for the response
    const categoriesWithImages = await Promise.all(
      createdCategories.map(async (category) => {
        const fullCategory = await this.categoriesRepository.findOne({
          where: { id: category.id },
          relations: ['images'],
        });
        return fullCategory || category;
      }),
    );

    return {
      success: true,
      message: `Successfully created ${createdCategories.length} categories.`,
      totalRows: rows.length,
      successCount: createdCategories.length,
      errorCount: 0,
      errors,
      data: categoriesWithImages,
    };
  }
}
