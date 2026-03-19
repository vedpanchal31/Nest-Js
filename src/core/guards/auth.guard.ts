import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AuthService } from 'src/domain/auth/auth.service';
import { IS_PUBLIC_KEY, ROLES_KEY, UserType } from '../constants/app.constants';
import { ITokenPayload } from 'src/core/constants/interfaces/common';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    // 1. Check if route is Public
    let isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const token = this.extractTokenFromHeader(request);

    // If public AND token exists, we force validation to identify the user
    if (isPublic && token) {
      isPublic = false;
    }

    // If public and no token, allow access
    if (isPublic) return true;

    // 2. Token Validation
    if (!token) {
      throw new UnauthorizedException({
        status: false,
        message: 'Token is required',
      });
    }

    const user = await this.authService.validate(token);
    if (!user) {
      throw new UnauthorizedException({
        status: false,
        message: 'Invalid or expired token',
      });
    }

    (request as Request & { user: ITokenPayload }).user = user;

    // 3. Role Authorization (Replacing SupplierGuard)
    const requiredRoles = this.reflector.getAllAndOverride<UserType[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (requiredRoles && !requiredRoles.includes(user.userType)) {
      throw new ForbiddenException({
        status: false,
        message: 'You do not have permission to access this resource',
      });
    }

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
