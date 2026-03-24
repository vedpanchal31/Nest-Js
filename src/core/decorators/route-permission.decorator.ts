import { SetMetadata } from '@nestjs/common';
import { ROUTE_PERMISSION_KEY } from '../constants/app.constants';

export const RoutePermission = (permission: string) =>
  SetMetadata(ROUTE_PERMISSION_KEY, permission);
