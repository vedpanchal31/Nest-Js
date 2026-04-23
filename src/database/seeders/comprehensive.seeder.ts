import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../../domain/users/entities/user.entity';
import { Profile } from '../../domain/users/entities/profile.entity';
import { Role } from '../../domain/roles/entities/role.entity';
import { Permission } from '../../domain/roles/entities/permission.entity';
import { Product } from '../../domain/products/entities/product.entity';
import { ProductImage } from '../../domain/products/entities/product-image.entity';
import { Category } from '../../domain/categories/entities/category.entity';
import { CategoryImage } from '../../domain/categories/entities/category-image.entity';
import { UserType } from '../../core/constants/app.constants';
import { config } from 'dotenv';

// Load environment variables
config();

async function runSeeder() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    entities: [
      User,
      Profile,
      Role,
      Permission,
      Product,
      ProductImage,
      Category,
      CategoryImage,
    ],
    synchronize: false,
  });

  try {
    await dataSource.initialize();

    // Repositories
    const userRepository = dataSource.getRepository(User);
    const categoryRepository = dataSource.getRepository(Category);
    const productRepository = dataSource.getRepository(Product);

    console.log('🌱 Starting comprehensive seeder...');

    // 1. Create Users for all UserTypes
    console.log('👥 Creating users...');
    await createUsers(userRepository);

    // 2. Create Categories
    console.log('📁 Creating categories...');
    await createCategories(categoryRepository);

    // 3. Create Products with stock
    console.log('📦 Creating products with stock...');
    await createProducts(productRepository, categoryRepository);

    console.log('✅ Comprehensive seeder completed successfully!');
  } catch (error) {
    console.error('❌ Error in comprehensive seeder:', error);
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

async function createUsers(userRepository: any) {
  const users = [
    {
      email: 'admin@yopmail.com',
      name: 'Admin User',
      userType: UserType.ADMIN,
      mobile: '9876543210',
      address: 'Admin Headquarters, 123 Tech Avenue, Server City',
    },
    {
      email: 'supplier@yopmail.com',
      name: 'Supplier User',
      userType: UserType.SUPPLIER,
      mobile: '9876543211',
      address: 'Supplier Warehouse, 456 Commerce Street, Trade City',
    },
    {
      email: 'customer@yopmail.com',
      name: 'Customer User',
      userType: UserType.USER,
      mobile: '9876543212',
      address: 'Customer Home, 789 Residential Lane, Home City',
    },
    {
      email: 'subadmin@yopmail.com',
      name: 'SubAdmin User',
      userType: UserType.SUBADMIN,
      mobile: '9876543213',
      address: 'SubAdmin Office, 321 Management Boulevard, Admin City',
    },
    {
      email: 'delivery@yopmail.com',
      name: 'Delivery Partner',
      userType: UserType.DELIVERY_PARTNER,
      mobile: '9876543214',
      address: 'Delivery Hub, 654 Logistics Road, Transport City',
    },
  ];

  const saltOrRounds = 10;
  const hashedPassword = await bcrypt.hash('Password@123', saltOrRounds);

  for (const userData of users) {
    // For admin user, check if any admin already exists
    if (userData.userType === UserType.ADMIN) {
      const existingAdmin = await userRepository.findOne({
        where: { userType: UserType.ADMIN },
      });

      if (existingAdmin) {
        console.log(
          `⚠️  Admin user already exists (${existingAdmin.email}). Skipping admin creation.`,
        );
        continue;
      }
    }

    // Check if user already exists
    const existingUser = await userRepository.findOne({
      where: { email: userData.email },
    });

    if (existingUser) {
      // Delete dependent records first, then user and profile
      if (userData.userType === UserType.SUPPLIER) {
        // Delete products associated with this supplier first
        await userRepository.query(
          `DELETE FROM products WHERE "supplier_id" = $1`,
          [existingUser.id],
        );
      }

      // Delete profile and user
      await userRepository.query(`DELETE FROM profiles WHERE email = $1`, [
        userData.email,
      ]);
      await userRepository.query(`DELETE FROM users WHERE email = $1`, [
        userData.email,
      ]);
    }

    // Create the user
    const user = new User();
    user.name = userData.name;
    user.email = userData.email;
    user.password = hashedPassword;
    user.isEmailVerified = true;
    user.userType = userData.userType;

    // Create corresponding profile
    const profile = new Profile();
    profile.name = userData.name;
    profile.email = userData.email;
    profile.countryCode = '+91';
    profile.countryShortcode = 'IN';
    profile.mobile = userData.mobile;
    profile.address = userData.address;
    profile.dateOfBirth = new Date('1990-01-01');

    user.profile = profile;

    await userRepository.save(user);
    console.log(`✅ Created ${userData.name} (${userData.email})`);
  }
}

async function createCategories(categoryRepository: any) {
  const categories = [
    {
      name: 'Electronics',
      description: 'Electronic devices, gadgets, and accessories',
    },
    {
      name: 'Clothing',
      description: 'Fashion apparel, shoes, and accessories',
    },
    {
      name: 'Home & Kitchen',
      description: 'Home appliances, kitchenware, and decor',
    },
    {
      name: 'Books',
      description: 'Books, magazines, and educational materials',
    },
    {
      name: 'Sports & Outdoors',
      description: 'Sports equipment, outdoor gear, and fitness items',
    },
    {
      name: 'Beauty & Personal Care',
      description: 'Cosmetics, skincare, and personal care products',
    },
    {
      name: 'Toys & Games',
      description: 'Toys, games, and entertainment products',
    },
    {
      name: 'Automotive',
      description: 'Car accessories, parts, and automotive tools',
    },
  ];

  for (const categoryData of categories) {
    // Check if category already exists
    const existingCategory = await categoryRepository.findOne({
      where: { name: categoryData.name },
    });

    if (!existingCategory) {
      const category = new Category();
      category.name = categoryData.name;
      category.description = categoryData.description;

      await categoryRepository.save(category);
      console.log(`✅ Created category: ${categoryData.name}`);
    } else {
      console.log(`⚠️  Category already exists: ${categoryData.name}`);
    }
  }
}

async function createProducts(productRepository: any, categoryRepository: any) {
  // Get all categories
  const categories = await categoryRepository.find();
  const supplierUser = await productRepository.manager
    .createQueryBuilder()
    .select('user')
    .from(User, 'user')
    .where('user.userType = :userType', { userType: UserType.SUPPLIER })
    .getOne();

  if (!supplierUser) {
    console.log('❌ No supplier user found. Please create supplier first.');
    return;
  }

  const products = [
    // Electronics
    {
      name: 'Wireless Mouse',
      description: 'Ergonomic wireless mouse with 2.4GHz connectivity',
      price: 29.99,
      stockQuantity: 50,
      minStockThreshold: 10,
      reorderLevel: 20,
      category: 'Electronics',
    },
    {
      name: 'Mechanical Keyboard',
      description: 'RGB mechanical gaming keyboard with blue switches',
      price: 89.99,
      stockQuantity: 30,
      minStockThreshold: 5,
      reorderLevel: 15,
      category: 'Electronics',
    },
    {
      name: 'Laptop Stand',
      description: 'Adjustable aluminum laptop stand for better ergonomics',
      price: 49.99,
      stockQuantity: 25,
      minStockThreshold: 8,
      reorderLevel: 18,
      category: 'Electronics',
    },
    // Clothing
    {
      name: 'Cotton T-Shirt',
      description: 'Comfortable 100% cotton t-shirt for daily wear',
      price: 19.99,
      stockQuantity: 100,
      minStockThreshold: 20,
      reorderLevel: 40,
      category: 'Clothing',
    },
    {
      name: 'Denim Jeans',
      description: 'Classic fit denim jeans with stretch comfort',
      price: 59.99,
      stockQuantity: 40,
      minStockThreshold: 10,
      reorderLevel: 25,
      category: 'Clothing',
    },
    {
      name: 'Sports Shoes',
      description: 'Comfortable running shoes with breathable mesh',
      price: 79.99,
      stockQuantity: 35,
      minStockThreshold: 8,
      reorderLevel: 20,
      category: 'Clothing',
    },
    // Home & Kitchen
    {
      name: 'Coffee Maker',
      description: 'Automatic drip coffee maker with timer function',
      price: 129.99,
      stockQuantity: 20,
      minStockThreshold: 5,
      reorderLevel: 12,
      category: 'Home & Kitchen',
    },
    {
      name: 'Blender',
      description: 'High-speed blender for smoothies and food processing',
      price: 89.99,
      stockQuantity: 15,
      minStockThreshold: 3,
      reorderLevel: 8,
      category: 'Home & Kitchen',
    },
    {
      name: 'Cutlery Set',
      description: '24-piece stainless steel cutlery set with wooden block',
      price: 149.99,
      stockQuantity: 12,
      minStockThreshold: 2,
      reorderLevel: 6,
      category: 'Home & Kitchen',
    },
    // Books
    {
      name: 'Programming Guide',
      description: 'Comprehensive guide to modern programming practices',
      price: 39.99,
      stockQuantity: 60,
      minStockThreshold: 15,
      reorderLevel: 30,
      category: 'Books',
    },
    {
      name: 'Fiction Novel',
      description: 'Bestselling fiction novel with compelling storyline',
      price: 24.99,
      stockQuantity: 80,
      minStockThreshold: 20,
      reorderLevel: 40,
      category: 'Books',
    },
    {
      name: 'Cookbook',
      description: 'International cuisine recipes for home cooking',
      price: 34.99,
      stockQuantity: 45,
      minStockThreshold: 10,
      reorderLevel: 25,
      category: 'Books',
    },
    // Sports & Outdoors
    {
      name: 'Yoga Mat',
      description: 'Non-slip exercise yoga mat with carrying strap',
      price: 29.99,
      stockQuantity: 70,
      minStockThreshold: 15,
      reorderLevel: 35,
      category: 'Sports & Outdoors',
    },
    {
      name: 'Dumbbells Set',
      description: 'Adjustable dumbbells set with weight plates',
      price: 199.99,
      stockQuantity: 10,
      minStockThreshold: 2,
      reorderLevel: 5,
      category: 'Sports & Outdoors',
    },
    {
      name: 'Tennis Racket',
      description: 'Professional grade tennis racket with vibration dampening',
      price: 149.99,
      stockQuantity: 18,
      minStockThreshold: 4,
      reorderLevel: 10,
      category: 'Sports & Outdoors',
    },
    // Beauty & Personal Care
    {
      name: 'Face Cream',
      description: 'Moisturizing face cream with SPF 30 protection',
      price: 24.99,
      stockQuantity: 90,
      minStockThreshold: 20,
      reorderLevel: 45,
      category: 'Beauty & Personal Care',
    },
    {
      name: 'Shampoo Set',
      description: 'Complete hair care set with shampoo and conditioner',
      price: 34.99,
      stockQuantity: 55,
      minStockThreshold: 12,
      reorderLevel: 28,
      category: 'Beauty & Personal Care',
    },
    {
      name: 'Perfume',
      description: 'Long-lasting fragrance with floral notes',
      price: 79.99,
      stockQuantity: 25,
      minStockThreshold: 5,
      reorderLevel: 15,
      category: 'Beauty & Personal Care',
    },
    // Toys & Games
    {
      name: 'Board Game',
      description: 'Strategy board game for family game nights',
      price: 39.99,
      stockQuantity: 40,
      minStockThreshold: 8,
      reorderLevel: 20,
      category: 'Toys & Games',
    },
    {
      name: 'Building Blocks',
      description: 'Creative building blocks set for kids',
      price: 49.99,
      stockQuantity: 30,
      minStockThreshold: 6,
      reorderLevel: 15,
      category: 'Toys & Games',
    },
    {
      name: 'Puzzle Set',
      description: '1000-piece jigsaw puzzle with beautiful artwork',
      price: 29.99,
      stockQuantity: 50,
      minStockThreshold: 10,
      reorderLevel: 25,
      category: 'Toys & Games',
    },
    // Automotive
    {
      name: 'Car Phone Mount',
      description: 'Adjustable car phone holder for dashboard mounting',
      price: 19.99,
      stockQuantity: 85,
      minStockThreshold: 17,
      reorderLevel: 40,
      category: 'Automotive',
    },
    {
      name: 'Car Cover',
      description: 'Waterproof car cover for all-weather protection',
      price: 89.99,
      stockQuantity: 22,
      minStockThreshold: 4,
      reorderLevel: 12,
      category: 'Automotive',
    },
    {
      name: 'Tire Pressure Gauge',
      description: 'Digital tire pressure gauge with LED display',
      price: 24.99,
      stockQuantity: 65,
      minStockThreshold: 13,
      reorderLevel: 30,
      category: 'Automotive',
    },
  ];

  for (const productData of products) {
    // Check if product already exists
    const existingProduct = await productRepository.findOne({
      where: { name: productData.name },
    });

    if (!existingProduct) {
      // Find the category
      const category = categories.find(
        (cat: any) => cat.name === productData.category,
      );

      if (category) {
        const product = new Product();
        product.name = productData.name;
        product.description = productData.description;
        product.price = productData.price;
        product.stockQuantity = productData.stockQuantity;
        product.minStockThreshold = productData.minStockThreshold;
        product.reorderLevel = productData.reorderLevel;
        product.isAvailable = true;
        product.supplier = supplierUser;
        product.category = category;

        await productRepository.save(product);
        console.log(
          `✅ Created product: ${productData.name} (Stock: ${productData.stockQuantity})`,
        );
      } else {
        console.log(`❌ Category not found: ${productData.category}`);
      }
    } else {
      console.log(`⚠️  Product already exists: ${productData.name}`);
    }
  }
}

void runSeeder();
