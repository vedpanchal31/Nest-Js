import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesService } from 'src/domain/roles/roles.service';
import { ROUTE_PERMISSION_KEY, UserType } from '../constants/app.constants';
import { ITokenPayload } from 'src/core/constants/interfaces/common';
import { PermissionType } from '../constants/interfaces/common/permissions';

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly rolesService: RolesService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<{ user?: ITokenPayload }>();
    const user = request.user;

    const routeKey = this.reflector.getAllAndOverride<string>(
      ROUTE_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no specific permission required, allow access (unless other guards block it)
    if (!routeKey) return true;

    // Guard against missing user object (if AuthGuard was skipped)
    if (!user) {
      throw new UnauthorizedException({
        status: false,
        message: 'Unauthorized: User session not found',
      });
    }

    // Admin (Super Admin) bypasses permission checks
    if (user.userType === UserType.ADMIN) return true;

    // Supplier bypass for product-related routes (they have their own logic in services)
    if (user.userType === UserType.SUPPLIER) return true;

    // Delivery Partner bypass for Order Updates (Restricted by Service logic)
    // Cast to string to satisfy @typescript-eslint/no-unsafe-enum-comparison
    if (
      user.userType === UserType.DELIVERY_PARTNER &&
      (routeKey === (PermissionType.UPDATE_ORDER_STATUS as string) ||
        routeKey === (PermissionType.VIEW_ORDERS as string))
    ) {
      return true;
    }

    // For SubAdmin, Other User, etc., check permissions
    if (!user.roleId) {
      throw new ForbiddenException({
        status: false,
        message: 'Access denied: No role assigned to user',
      });
    }

    const hasAccess = await this.rolesService.hasAccess(user.roleId, routeKey);
    if (!hasAccess) {
      throw new ForbiddenException({
        status: false,
        message: 'Access denied: You do not have permission for this action',
      });
    }

    return true;
  }
}
