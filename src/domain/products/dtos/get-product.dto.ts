import { ApiProperty } from '@nestjs/swagger';

export class ProductImageDto {
  @ApiProperty({
    description: 'Image ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Image URL',
    example: 'https://example.com/images/mouse-1.jpg',
  })
  url: string;
}

export class CategoryDto {
  @ApiProperty({
    description: 'Category ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Category Name',
    example: 'Electronics',
  })
  name: string;

  @ApiProperty({
    description: 'Category Description',
    example: 'All kinds of electronic items',
    required: false,
  })
  description?: string;

  @ApiProperty({
    description: 'Category Image URL',
    example: 'https://example.com/category-image.jpg',
    required: false,
  })
  image?: string;
}

export class GetProductDto {
  @ApiProperty({
    description: 'Product ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Product Name',
    example: 'Wireless Mouse',
  })
  name: string;

  @ApiProperty({
    description: 'Product Description',
    example: 'A high-quality wireless mouse',
  })
  description: string;

  @ApiProperty({
    description: 'Product Price',
    example: 25.99,
  })
  price: number;

  @ApiProperty({
    description: 'Product Images',
    type: [ProductImageDto],
  })
  images: ProductImageDto[];

  @ApiProperty({
    description: 'Product Category',
    type: CategoryDto,
  })
  category: CategoryDto;

  @ApiProperty({
    description: 'Supplier ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  supplierId: string;

  @ApiProperty({
    description: 'Product Creation Date',
    example: '2022-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Product Update Date',
    example: '2022-01-01T00:00:00.000Z',
  })
  updatedAt: Date;
}
