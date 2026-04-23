import { DataSource } from 'typeorm';
import { Product } from '../domain/products/entities/product.entity';
import { ProductImage } from '../domain/products/entities/product-image.entity';
import { Category } from '../domain/categories/entities/category.entity';
import { CategoryImage } from '../domain/categories/entities/category-image.entity';
import { User } from '../domain/users/entities/user.entity';
import { Profile } from '../domain/users/entities/profile.entity';
import { Role } from '../domain/roles/entities/role.entity';
import { Permission } from '../domain/roles/entities/permission.entity';
import { config } from 'dotenv';

// Load environment variables
config();

async function getUuids() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    entities: [
      Product,
      ProductImage,
      Category,
      CategoryImage,
      User,
      Profile,
      Role,
      Permission,
    ],
    synchronize: false,
  });

  try {
    await dataSource.initialize();

    const productRepository = dataSource.getRepository(Product);
    const categoryRepository = dataSource.getRepository(Category);

    // Get sample product UUIDs
    const products = await productRepository.find({
      select: ['id', 'name'],
      take: 5,
    });

    console.log('📦 Product UUIDs for testing:');
    products.forEach((product) => {
      console.log(`  ${product.name}: ${product.id}`);
    });

    // Get sample category UUIDs
    const categories = await categoryRepository.find({
      select: ['id', 'name'],
      take: 5,
    });

    console.log('\n📁 Category UUIDs for testing:');
    categories.forEach((category) => {
      console.log(`  ${category.name}: ${category.id}`);
    });

    console.log('\n✅ Use these UUIDs to test the image upload API');
    console.log('Example API call:');
    console.log('POST /media/images/add');
    console.log('Content-Type: multipart/form-data');
    console.log('entityType: product');
    console.log('entityId: [copy one of the UUIDs above]');
    console.log('image: [your image file]');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

void getUuids();
