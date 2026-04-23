import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { User } from '../users/entities/user.entity';
import { CreateRoleDto } from './dtos/create-role.dto';
import { UpdateRoleDto } from './dtos/update-role.dto';
import { UpdateRolePermissionsDto } from './dtos/update-permissions.dto';
import { AssignRoleDto } from './dtos/assign-role.dto';
import { PermissionType } from 'src/core/constants/app.constants';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionsRepository: Repository<Permission>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  // 1
  async getAllRoles() {
    return await this.rolesRepository.find({
      relations: ['permissions', 'createdBy'],
    });
  }

  // 2
  async getRoleById(id: string) {
    const role = await this.rolesRepository.findOne({
      where: { id },
      relations: ['permissions', 'createdBy'],
    });
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  // 3
  async createRole(dto: CreateRoleDto) {
    const existingRole = await this.rolesRepository.findOne({
      where: { name: dto.name },
    });
    if (existingRole) {
      throw new BadRequestException(
        `Role with name "${dto.name}" already exists`,
      );
    }

    const role = this.rolesRepository.create({
      name: dto.name,
      description: dto.description,
      type: dto.type,
    });

    if (dto.userId) {
      role.createdBy = { id: dto.userId } as User;
    }

    return await this.rolesRepository.save(role);
  }

  // 4
  async updateRole(id: string, dto: UpdateRoleDto) {
    const role = await this.getRoleById(id);

    if (dto.name) {
      role.name = dto.name;
    }

    if (dto.description) {
      role.description = dto.description;
    }

    return await this.rolesRepository.save(role);
  }

  // 5
  async deleteRole(id: string) {
    const role = await this.getRoleById(id);
    return await this.rolesRepository.remove(role);
  }

  // 6
  async getPermissionsByRoleId(roleId: string) {
    const role = await this.getRoleById(roleId);
    return role.permissions;
  }

  // 7
  async updateRolePermissions(roleId: string, dto: UpdateRolePermissionsDto) {
    const role = await this.getRoleById(roleId);

    const permissions = await Promise.all(
      dto.permissions.map((name) => this.getOrCreatePermission(name)),
    );

    role.permissions = permissions;
    return await this.rolesRepository.save(role);
  }

  // 8
  async getAllPermissions() {
    return await this.permissionsRepository.find();
  }

  // 9
  async assignRoleToUser(dto: AssignRoleDto) {
    const user = await this.usersRepository.findOne({
      where: { id: dto.userId },
      relations: ['roles'],
    });
    if (!user) throw new NotFoundException('User not found');

    const role = await this.getRoleById(dto.roleId);

    // Add role if not already present
    if (!user.roles.some((r) => r.id === role.id)) {
      user.roles.push(role);
    }

    return await this.usersRepository.save(user);
  }

  // 10
  async hasAccess(roleId: string, permissionName: string): Promise<boolean> {
    const role = await this.rolesRepository.findOne({
      where: { id: roleId },
      relations: ['permissions'],
    });
    if (!role) return false;
    return role.permissions.some((p) => p.name === permissionName);
  }

  // Helper: ensures permission exists in DB
  private async getOrCreatePermission(
    name: PermissionType,
  ): Promise<Permission> {
    let permission = await this.permissionsRepository.findOne({
      where: { name },
    });
    if (!permission) {
      permission = this.permissionsRepository.create({ name });
      await this.permissionsRepository.save(permission);
    }
    return permission;
  }
}
