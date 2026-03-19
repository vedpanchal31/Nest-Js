import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../../domain/users/entities/user.entity';
import { Profile } from '../../domain/users/entities/profile.entity';
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
    entities: [User, Profile],
    synchronize: false,
  });

  try {
    await dataSource.initialize();

    const userRepository = dataSource.getRepository(User);

    const adminEmail = 'info@admin.com';

    // Check if admin already exists
    const existingAdmin = await userRepository.findOne({
      where: { email: adminEmail },
    });

    if (existingAdmin) {
      await dataSource.query(`DELETE FROM profiles WHERE email = $1`, [
        adminEmail,
      ]);
      await dataSource.query(`DELETE FROM users WHERE email = $1`, [
        adminEmail,
      ]);
    }

    // Hash the password
    const saltOrRounds = 10;
    const hashedPassword = await bcrypt.hash('Admin@123', saltOrRounds);

    // Create the admin user
    const adminUser = new User();
    adminUser.name = 'Admin';
    adminUser.email = adminEmail;
    adminUser.password = hashedPassword;
    adminUser.isEmailVerified = true;
    adminUser.userType = UserType.ADMIN;

    // Create a corresponding profile
    const adminProfile = new Profile();
    adminProfile.name = 'Admin';
    adminProfile.email = adminEmail;
    adminProfile.countryCode = '+91';
    adminProfile.countryShortcode = 'IN';
    adminProfile.mobile = '9876543210';
    adminProfile.address = 'Admin Headquarters, 123 Tech Avenue, Server City';
    adminProfile.dateOfBirth = new Date('1990-01-01');

    adminUser.profile = adminProfile;

    // Save to database
    await userRepository.save(adminUser);
  } catch (error) {
    console.error('Error seeding admin user:', error);
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

void runSeeder();
