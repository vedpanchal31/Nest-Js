import { DataSource } from 'typeorm';
import { Permission } from '../../domain/roles/entities/permission.entity';
import { Role } from '../../domain/roles/entities/role.entity';
import { User } from '../../domain/users/entities/user.entity';
import { Profile } from '../../domain/users/entities/profile.entity';
import { Product } from '../../domain/products/entities/product.entity';
import { Category } from '../../domain/categories/entities/category.entity';
import { PermissionType } from '../../core/constants/app.constants';
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
    entities: [Permission, Role, User, Profile, Product, Category],
    synchronize: false,
  });

  try {
    await dataSource.initialize();

    const permissionRepository = dataSource.getRepository(Permission);

    // Get all permissions from PermissionType enum
    const permissions = Object.values(PermissionType);

    for (const permissionName of permissions) {
      // Check if permission already exists
      const existingPermission = await permissionRepository.findOne({
        where: { name: permissionName },
      });

      if (!existingPermission) {
        // Create the permission
        const permission = new Permission();
        permission.name = permissionName;
        await permissionRepository.save(permission);
        console.log(`Permission seeded: ${permissionName}`);
      } else {
        console.log(`Permission already exists: ${permissionName}`);
      }
    }

    console.log('Permission seeding completed successfully');
  } catch (error) {
    console.error('Error seeding permissions:', error);
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

void runSeeder();
