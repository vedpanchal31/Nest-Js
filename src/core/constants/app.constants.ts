import { PermissionType } from './interfaces/common/permissions';

export enum TokenType {
  VERIFY_EMAIL = 1,
  LOGIN = 2,
  RESET_PASSWORD = 3,
}

export enum OtpType {
  EMAIL_VERIFICATION = 1,
  FORGOT_PASSWORD = 2,
}

export enum UserType {
  USER = 1, // Customer
  ADMIN = 2, // Admin
  SUPPLIER = 3, // Supplier
  SUBADMIN = 4, // SubAdmin
  DELIVERY_PARTNER = 5, // Delivery Partner
}

export const IS_PUBLIC_KEY = 'isPublic';
export const ROLES_KEY = 'roles';
export const PERMISSIONS_KEY = 'permissions';
export const ROUTE_PERMISSION_KEY = 'routePermission';

export { PermissionType };

export const ROLES = {
  SUB_ADMIN: 1,
  SUPPLIER_SUB_ADMIN: 2,
};

export enum OrderStatus {
  PENDING = 1,
  CONFIRMED = 2,
  SHIPPED = 3,
  DELIVERED = 4,
  CANCELLED = 5,
}

export enum PaymentMethod {
  CASH_ON_DELIVERY = 1,
  ONLINE = 2,
}

export enum PaymentStatus {
  PENDING = 1,
  COMPLETED = 2,
  FAILED = 3,
}

export const FILE_PATHS = {
  MEDIA: 'public/media',
  MEDIA_IMAGE: 'public/media/images',
  MEDIA_VIDEO: 'public/media/videos',
  MEDIA_DOCUMENT: 'public/media/documents',
} as const;

export type FilePathKey = keyof typeof FILE_PATHS;
