import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  ParseIntPipe,
  Put,
  Query,
  Req,
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
import { Roles } from 'src/core/decorators/roles.decorator';
import { RoutePermission } from 'src/core/decorators/route-permission.decorator';
import { ITokenPayload } from 'src/core/constants/interfaces/common';
import { UpdateProfileDto } from './dtos/update-profile.dto';
import { UserType, PermissionType } from 'src/core/constants/app.constants';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserType.ADMIN)
  @RoutePermission(PermissionType.VIEW_USERS)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all users' })
  @ApiQuery({
    name: 'page',
    required: true,
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: true,
    example: 10,
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search',
  })
  @ApiQuery({
    name: 'userType',
    required: false,
    type: String,
    description: 'User Type',
  })
  @ApiResponse({
    status: 200,
    description: 'List of all users',
  })
  async getUsers(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('search') search?: string,
    @Query('userType') userType?: UserType,
  ) {
    return await this.usersService.getAllUsers(page, limit, search, userType);
  }

  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @Get('profile')
  @ApiOperation({ summary: 'Get user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile',
  })
  async getProfile(@Req() req: Request & { user: ITokenPayload }) {
    return await this.usersService.findOne(req.user.id);
  }

  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @Put('profile')
  @ApiOperation({ summary: 'Update user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile updated successfully',
  })
  async updateProfile(
    @Req() req: Request & { user: ITokenPayload },
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return await this.usersService.updateProfile(req.user.id, updateProfileDto);
  }

  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @Delete('profile')
  @ApiOperation({ summary: 'Soft delete user account' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  async remove(@Req() req: Request & { user: ITokenPayload }) {
    return await this.usersService.removeUser(req.user.id);
  }
}
