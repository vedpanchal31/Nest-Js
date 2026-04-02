import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { ProductImage } from './entities/product-image.entity';
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
import { UpdateProductDto } from './dtos/update-product.dto';
import { BulkUploadService, BulkUploadResult, ParsedRow } from 'src/core/bulk-upload/bulk-upload.service';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectRepository(ProductImage)
    private readonly productImageRepository: Repository<ProductImage>,
    private readonly cloudinaryService: CloudinaryService,
    private readonly categoriesService: CategoriesService,
    private readonly usersService: UsersService,
    private readonly bulkUploadService: BulkUploadService,
  ) { }

  async createProduct(
    user: ITokenPayload,
    dto: CreateProductDto,
    images: Express.Multer.File[],
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
      const category = await this.categoriesService.getAllCategoriesById(dto.categoryId);
      if (!category) {
        throw new BadRequestException('Category not found');
      }

      // Create and save the product
      const product = this.productsRepository.create({
        name: dto.name,
        description: dto.description,
        price: parseFloat(dto.price),
        supplier: { id: supplierId } as User,
        category: { id: dto.categoryId } as Category,
      });

      const savedProduct = await this.productsRepository.save(product) as unknown as Product;

      // Upload images if provided
      if (images && images.length > 0) {
        for (const image of images) {
          const uploadedImage = (await this.cloudinaryService.uploadImage(
            image,
            'E-commerce',
          )) as UploadApiResponse;

          const productImage = this.productImageRepository.create({
            url: uploadedImage.secure_url,
            product: { id: savedProduct.id } as Product,
          });
          await this.productImageRepository.save(productImage);
        }
      }

      return savedProduct;
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
        .leftJoinAndSelect('product.images', 'images')
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

  async updateProduct(
    id: string,
    user: ITokenPayload,
    dto: UpdateProductDto,
    images: Express.Multer.File[],
  ) {
    const product = await this.productsRepository.findOne({
      where: { id },
      relations: ['supplier', 'category'],
    });
    if (!product) {
      throw new BadRequestException('Product not found');
    }
    if (
      user.userType === UserType.SUPPLIER &&
      product.supplier.id !== user.id
    ) {
      throw new BadRequestException(
        'You are not authorized to update this product',
      );
    }
    if (dto.name) {
      product.name = dto.name;
    }
    if (dto.description) {
      product.description = dto.description;
    }
    if (dto.price) {
      product.price = parseFloat(dto.price);
    }
    if (dto.categoryId) {
      product.category = { id: dto.categoryId } as Category;
    }

    const savedProduct = await this.productsRepository.save(product);

    // Upload additional images if provided
    if (images && images.length > 0) {
      for (const image of images) {
        const uploadedImage = (await this.cloudinaryService.uploadImage(
          image,
          'E-commerce',
        )) as UploadApiResponse;

        const productImage = this.productImageRepository.create({
          url: uploadedImage.secure_url,
          product: savedProduct,
        });
        await this.productImageRepository.save(productImage);
      }
    }

    return savedProduct;
  }

  async deleteProduct(id: string, user: ITokenPayload) {
    // 1. Fetch existing product
    const product = await this.productsRepository.findOne({
      where: { id },
      relations: ['supplier'],
    });

    if (!product) throw new BadRequestException('Product not found');

    // 2. Authorization: Check if user has permission
    // Supplier can only delete their own. Admin can delete anything.
    if (
      user.userType === UserType.SUPPLIER &&
      product.supplier.id !== user.id
    ) {
      throw new ForbiddenException(
        'You do not have permission to delete this product',
      );
    }

    // 3. Delete the product
    await this.productsRepository.remove(product);

    return {
      message: 'Product deleted successfully',
      id,
    };
  }

  async getAllCategoryNames(): Promise<string[]> {
    const categories = await this.categoriesService.getAllCategories(1, 1000);
    return categories.data.map((c) => c.name);
  }

  async getAllSupplierEmails(): Promise<string[]> {
    const suppliers = await this.usersService.getAllUsers(1, 1000, undefined, UserType.SUPPLIER);
    return suppliers.users.map((u) => u.email);
  }

  async getAllSupplierNames(): Promise<string[]> {
    const suppliers = await this.usersService.getAllUsers(1, 1000, undefined, UserType.SUPPLIER);
    return suppliers.users.map((u) => u.name);
  }

  async bulkUploadProducts(
    user: ITokenPayload,
    excelBuffer: Buffer,
    zipBuffer?: Buffer,
  ): Promise<BulkUploadResult<Product>> {
    // Determine expected columns based on user type
    const isAdmin = user.userType === UserType.ADMIN;
    // New column order: Category (1), Supplier (2 - admin only), Name, Description, Price, Images
    const expectedColumns = isAdmin
      ? ['Category*', 'Supplier*', 'Name*', 'Description*', 'Price*', 'Images']
      : ['Category*', 'Name*', 'Description*', 'Price*', 'Images'];
    const requiredFields = isAdmin
      ? ['Category*', 'Supplier*', 'Name*', 'Description*']
      : ['Category*', 'Name*', 'Description*'];

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

    // Create column mapping (A, B, C, etc.)
    const columnMap: Record<string, string> = {};
    expectedColumns.forEach((col, index) => {
      columnMap[col] = String.fromCharCode(65 + index); // A=65, B=66, etc.
    });

    // Get all categories for name-to-id mapping
    const categoriesData = await this.categoriesService.getAllCategories(1, 1000);
    const categoryMap = new Map<string, string>();
    categoriesData.data.forEach((c) => categoryMap.set(c.name, c.id));

    // Get all suppliers for name-to-id mapping (for ADMIN)
    let supplierMap = new Map<string, string>();
    if (isAdmin) {
      const suppliersData = await this.usersService.getAllUsers(1, 1000, undefined, UserType.SUPPLIER);
      suppliersData.users.forEach((u) => supplierMap.set(u.name, u.id));
    }

    // First pass: Validate all rows and collect all errors
    const validRows: Array<{
      rowNumber: number;
      name: string;
      description: string;
      price: number;
      categoryId: string;
      supplierId: string;
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

      // New column order: Category (1), Supplier (2 - admin only), Name, Description, Price, Images
      const categoryName = String(row.data['Category*'] || '').trim();
      const name = String(row.data['Name*'] || '').trim();
      const description = String(row.data['Description*'] || '').trim();
      const priceRaw = row.data['Price*'];
      const imagesRaw = row.data['Images'] ? String(row.data['Images']).trim() : '';

      // Determine and validate supplier ID
      let supplierId: string | null = null;
      if (isAdmin) {
        const supplierName = String(row.data['Supplier*'] || '').trim();
        if (!supplierName) {
          errors.push({
            row: row.rowNumber,
            column: columnMap['Supplier*'],
            field: 'Supplier*',
            value: '',
            message: 'Supplier is required for admin users',
          });
          hasRowError = true;
        } else {
          const mappedSupplierId = supplierMap.get(supplierName);
          if (!mappedSupplierId) {
            errors.push({
              row: row.rowNumber,
              column: columnMap['Supplier*'],
              field: 'Supplier*',
              value: supplierName,
              message: `Supplier with name "${supplierName}" not found`,
            });
            hasRowError = true;
          } else {
            supplierId = mappedSupplierId;
          }
        }
      } else {
        supplierId = user.id;
      }

      // Validate category
      const categoryId = categoryMap.get(categoryName);
      if (!categoryId) {
        errors.push({
          row: row.rowNumber,
          column: columnMap['Category*'],
          field: 'Category*',
          value: categoryName,
          message: `Category "${categoryName}" not found. Please use a valid category name.`,
        });
        hasRowError = true;
      }

      // Validate price
      let price: number | null = null;
      if (priceRaw === undefined || priceRaw === '' || priceRaw === null) {
        errors.push({
          row: row.rowNumber,
          column: columnMap['Price*'],
          field: 'Price*',
          value: '',
          message: 'Price is required',
        });
        hasRowError = true;
      } else {
        price = parseFloat(String(priceRaw));
        if (isNaN(price) || price <= 0) {
          errors.push({
            row: row.rowNumber,
            column: columnMap['Price*'],
            field: 'Price*',
            value: priceRaw,
            message: 'Price must be a valid number greater than 0',
          });
          hasRowError = true;
          price = null;
        }
      }

      // Check for duplicate product name for this supplier (only if supplierId is valid)
      if (supplierId && name) {
        const existingProduct = await this.productsRepository.findOne({
          where: {
            name: name,
            supplier: { id: supplierId },
          },
        });

        if (existingProduct) {
          errors.push({
            row: row.rowNumber,
            column: columnMap['Name*'],
            field: 'Name*',
            value: name,
            message: `You already have a product named "${name}"`,
          });
          hasRowError = true;
        }
      }

      // Parse and validate image names
      const imageNames = imagesRaw
        .split(',')
        .map((n) => n.trim())
        .filter((n) => n.length > 0);

      // Validate images exist in ZIP (if images are specified)
      if (imageNames.length > 0) {
        const { unmatched } = this.bulkUploadService.matchImages(imageNames, zipImages);
        for (const unmatchedName of unmatched) {
          errors.push({
            row: row.rowNumber,
            column: columnMap['Images'] || '-',
            field: 'Images',
            value: unmatchedName,
            message: `Image "${unmatchedName}" not found in ZIP file`,
          });
          hasRowError = true;
        }
      }

      // Only add to valid rows if no errors for this row
      if (!hasRowError && supplierId && categoryId && price !== null) {
        validRows.push({
          rowNumber: row.rowNumber,
          name,
          description,
          price,
          categoryId,
          supplierId,
          imageNames,
        });
      }
    }

    // If any errors found, return without creating any products
    if (errors.length > 0) {
      return {
        success: false,
        message: 'Failed to create products. Please fix the errors and try again.',
        totalRows: rows.length,
        successCount: 0,
        errorCount: errors.length,
        errors,
        data: [],
      };
    }

    // Second pass: Create all products (all rows are valid)
    const createdProducts: Product[] = [];

    for (const validRow of validRows) {
      try {
        const product = this.productsRepository.create({
          name: validRow.name,
          description: validRow.description,
          price: validRow.price,
          supplier: { id: validRow.supplierId } as User,
          category: { id: validRow.categoryId } as Category,
        });

        const savedProduct = await this.productsRepository.save(product);

        // Upload images if provided
        if (validRow.imageNames.length > 0) {
          const { matched } = this.bulkUploadService.matchImages(validRow.imageNames, zipImages);

          for (const [imageName, imageBuffer] of matched) {
            try {
              const mockFile: Express.Multer.File = {
                fieldname: 'images',
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

              const productImage = this.productImageRepository.create({
                url: uploadedImage.secure_url,
                product: { id: savedProduct.id } as Product,
              });

              await this.productImageRepository.save(productImage);
            } catch (uploadError) {
              // Log but continue - images are uploaded, association might fail
              console.error(`Failed to save image ${imageName}:`, uploadError);
            }
          }
        }

        createdProducts.push(savedProduct);
      } catch (saveError) {
        // If save fails, add to errors but this shouldn't happen as we validated everything
        errors.push({
          row: validRow.rowNumber,
          column: '-',
          field: 'Name*',
          value: validRow.name,
          message: `Failed to create product: ${saveError instanceof Error ? saveError.message : 'Unknown error'}`,
        });
      }
    }

    // Load products with their images for the response
    const productsWithImages = await Promise.all(
      createdProducts.map(async (product) => {
        const fullProduct = await this.productsRepository.findOne({
          where: { id: product.id },
          relations: ['images'],
        });
        return fullProduct || product;
      }),
    );

    return {
      success: true,
      message: `Successfully created ${createdProducts.length} products.`,
      totalRows: rows.length,
      successCount: createdProducts.length,
      errorCount: 0,
      errors,
      data: productsWithImages,
    };
  }
}
