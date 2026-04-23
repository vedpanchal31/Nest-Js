import { DataSource } from 'typeorm';
import { config } from 'dotenv';

// Load environment variables
config();

async function clearAllData() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    console.log('🧹 Starting to clear all data...');

    // Tables to clear in order to respect foreign key constraints
    const tables = [
      // Order related tables
      'order_items',
      'orders',

      // Cart related tables
      'cart_items',

      // Product related tables
      'product_images',
      'products',

      // Category related tables
      'category_images',
      'categories',

      // User related tables
      'user_roles',
      'profiles',
      'users',

      // Role and permission tables
      'role_permissions',
      'permissions',
      'roles',

      // Other tables
      'notifications',
      'delivery_partners',
      'settings',
    ];

    // Disable foreign key constraints temporarily
    await dataSource.query('SET session_replication_role = replica;');

    // Clear each table
    for (const table of tables) {
      try {
        await dataSource.query(`DELETE FROM ${table}`);
        console.log(`✅ Cleared table: ${table}`);
      } catch (error) {
        console.log(`⚠️  Could not clear table ${table}: ${error.message}`);
      }
    }

    // Reset auto-increment sequences
    const sequences = [
      'users_id_seq',
      'profiles_id_seq',
      'categories_id_seq',
      'products_id_seq',
      'orders_id_seq',
      'order_items_id_seq',
      'cart_items_id_seq',
      'roles_id_seq',
      'permissions_id_seq',
      'notifications_id_seq',
    ];

    for (const sequence of sequences) {
      try {
        await dataSource.query(`ALTER SEQUENCE ${sequence} RESTART WITH 1`);
        console.log(`🔄 Reset sequence: ${sequence}`);
      } catch (error) {
        console.log(
          `⚠️  Could not reset sequence ${sequence}: ${error.message}`,
        );
      }
    }

    // Re-enable foreign key constraints
    await dataSource.query('SET session_replication_role = DEFAULT;');

    console.log('✅ All data cleared successfully!');
  } catch (error) {
    console.error('❌ Error clearing data:', error);
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

void clearAllData();
