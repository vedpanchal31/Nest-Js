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
}

export const IS_PUBLIC_KEY = 'isPublic';
export const ROLES_KEY = 'roles';
