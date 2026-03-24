import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { AuthGuard } from 'src/core/guards/auth.guard';
import { RoleGuard } from 'src/core/guards/role.guard';
import { Roles } from 'src/core/decorators/roles.decorator';
import { RoutePermission } from 'src/core/decorators/route-permission.decorator';
import { UserType, PermissionType } from 'src/core/constants/app.constants';
import { CreateRoleDto } from './dtos/create-role.dto';
import { UpdateRoleDto } from './dtos/update-role.dto';
import { UpdateRolePermissionsDto } from './dtos/update-permissions.dto';
import { AssignRoleDto } from './dtos/assign-role.dto';

@ApiTags('Roles Management')
@Controller('roles')
@UseGuards(AuthGuard, RoleGuard)
@Roles(UserType.ADMIN)
@ApiBearerAuth()
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RoutePermission(PermissionType.VIEW_ROLES)
  @ApiOperation({ summary: 'get roles' })
  async getAllRoles() {
    return await this.rolesService.getAllRoles();
  }

  @Post()
  @RoutePermission(PermissionType.CREATE_ROLE)
  @ApiOperation({ summary: 'create role' })
  async createRole(@Body() dto: CreateRoleDto) {
    return await this.rolesService.createRole(dto);
  }

  @Patch(':id')
  @RoutePermission(PermissionType.UPDATE_ROLE)
  @ApiOperation({ summary: 'update role' })
  async updateRole(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return await this.rolesService.updateRole(id, dto);
  }

  @Delete(':id')
  @RoutePermission(PermissionType.DELETE_ROLE)
  @ApiOperation({ summary: 'delete role' })
  async deleteRole(@Param('id') id: string) {
    return await this.rolesService.deleteRole(id);
  }

  @Put('assign-role')
  @RoutePermission(PermissionType.ASSIGN_ROLE)
  @ApiOperation({ summary: 'assign role to user' })
  async assignRole(@Body() dto: AssignRoleDto) {
    return await this.rolesService.assignRoleToUser(dto);
  }

  @Get('permissions/:id')
  @RoutePermission(PermissionType.VIEW_PERMISSIONS)
  @ApiOperation({ summary: 'get permissions of role' })
  async getPermissionsByRoleId(@Param('id') id: string) {
    return await this.rolesService.getPermissionsByRoleId(id);
  }

  @Patch('permissions/:id')
  @RoutePermission(PermissionType.UPDATE_ROLE_PERMISSIONS)
  @ApiOperation({ summary: 'Update permissions of role' })
  async updateRolePermissions(
    @Param('id') id: string,
    @Body() dto: UpdateRolePermissionsDto,
  ) {
    return await this.rolesService.updateRolePermissions(id, dto);
  }
}

@ApiTags('Permissions')
@Controller('permissions')
@UseGuards(AuthGuard, RoleGuard)
@Roles(UserType.ADMIN)
@ApiBearerAuth()
export class PermissionsController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RoutePermission(PermissionType.VIEW_PERMISSIONS)
  @ApiOperation({ summary: 'get permissions' })
  async getAllPermissions() {
    return await this.rolesService.getAllPermissions();
  }
}
