import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { AuthGuard } from 'src/core/guards/auth.guard';
import { RoleGuard } from 'src/core/guards/role.guard';
import { RoutePermission } from 'src/core/decorators/route-permission.decorator';
import { UserType, PermissionType } from 'src/core/constants/app.constants';
import { CreateManagedUserDto } from './dtos/create-managed-user.dto';
import { UpdateManagedUserDto } from './dtos/update-managed-user.dto';

@ApiTags('User Management')
@Controller('user-management')
@UseGuards(AuthGuard, RoleGuard)
@ApiBearerAuth()
export class UserManagementController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RoutePermission(PermissionType.VIEW_USERS)
  @ApiOperation({ summary: 'Get all users with filtering (Admin only)' })
  @ApiQuery({ name: 'page', required: true, example: 1 })
  @ApiQuery({ name: 'limit', required: true, example: 10 })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'userType', required: false, enum: UserType })
  @ApiResponse({ status: 200, description: 'List of all users' })
  async getUsers(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('search') search?: string,
    @Query('userType') userType?: UserType,
  ) {
    return await this.usersService.getAllUsers(page, limit, search, userType);
  }

  @Post()
  @RoutePermission(PermissionType.CREATE_USER)
  @ApiOperation({ summary: 'Create any user (Admin only)' })
  async createManagedUser(@Body() dto: CreateManagedUserDto) {
    return await this.usersService.createUser(dto);
  }

  @Get(':id')
  @RoutePermission(PermissionType.VIEW_USER_BY_ID)
  @ApiOperation({ summary: 'Get any user by ID (Admin only)' })
  async getUserById(@Param('id') id: string) {
    return await this.usersService.findOne(id);
  }

  @Patch(':id')
  @RoutePermission(PermissionType.UPDATE_USER)
  @ApiOperation({ summary: 'Update any user (Admin only)' })
  async updateManagedUser(
    @Param('id') id: string,
    @Body() dto: UpdateManagedUserDto,
  ) {
    return await this.usersService.updateUser(id, dto);
  }

  @Delete(':id')
  @RoutePermission(PermissionType.DELETE_USER)
  @ApiOperation({ summary: 'Delete any user by ID (Admin only)' })
  async deleteUser(@Param('id') id: string) {
    return await this.usersService.removeUser(id);
  }
}
