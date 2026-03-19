import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { UserType } from 'src/core/constants/app.constants';
import { Request } from 'express';

interface RequestWithUser extends Request {
  user: {
    userType: UserType;
    [key: string]: unknown;
  };
}

@Injectable()
export class SupplierGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    // Check if the user is authenticated and is of UserType 3 (Supplier)
    if (user && user.userType === UserType.SUPPLIER) {
      return true;
    }

    throw new ForbiddenException('Only suppliers can perform this action');
  }
}
