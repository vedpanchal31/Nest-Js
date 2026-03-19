import { ApiProperty } from '@nestjs/swagger';

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
    description: 'Product Image URL',
    example: 'https://example.com/images/mouse.jpg',
  })
  image: string;

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
