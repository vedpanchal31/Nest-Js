import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { User } from '../users/entities/user.entity';
import { RolesService } from './roles.service';
import { RolesController, PermissionsController } from './roles.controller';
import { AuthModule } from '../auth/auth.module';
import { RoleGuard } from 'src/core/guards/role.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([Role, Permission, User]),
    forwardRef(() => AuthModule),
  ],
  controllers: [RolesController, PermissionsController],
  providers: [RolesService, RoleGuard],
  exports: [RolesService, TypeOrmModule, RoleGuard],
})
export class RolesModule {}
