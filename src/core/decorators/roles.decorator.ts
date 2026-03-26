import { SetMetadata } from '@nestjs/common';
import { ROLES_KEY, ROUTE_PERMISSION_KEY, UserType } from '../constants/app.constants';

export const Roles = (...roles: UserType[]) => SetMetadata(ROLES_KEY, roles);

export const RoutePermission = (permission: string) => SetMetadata(ROUTE_PERMISSION_KEY, permission);
