import { SetMetadata } from '@nestjs/common';
import { ROLES_KEY, UserType } from '../constants/app.constants';

export const Roles = (...roles: UserType[]) => SetMetadata(ROLES_KEY, roles);
