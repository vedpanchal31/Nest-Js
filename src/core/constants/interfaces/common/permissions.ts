export enum PermissionType {
  // Category Permissions
  VIEW_CATEGORIES = 'view-categories',
  CREATE_CATEGORY = 'create-category',
  UPDATE_CATEGORY = 'update-category',
  DELETE_CATEGORY = 'delete-category',

  // Product Permissions
  VIEW_PRODUCTS = 'view-products',
  CREATE_PRODUCT = 'create-product',
  UPDATE_PRODUCT = 'update-product',
  DELETE_PRODUCT = 'delete-product',

  // User Management
  VIEW_USERS = 'view-users',
  CREATE_USER = 'create-user',
  VIEW_USER_BY_ID = 'view-user-by-id',
  UPDATE_USER = 'update-user',
  DELETE_USER = 'delete-user',
  MANAGE_USERS = 'manage-users',

  // Role Management
  VIEW_ROLES = 'view-roles',
  CREATE_ROLE = 'create-role',
  UPDATE_ROLE = 'update-role',
  DELETE_ROLE = 'delete-role',
  ASSIGN_ROLE = 'assign-role',
  VIEW_PERMISSIONS = 'view-permissions',
  UPDATE_ROLE_PERMISSIONS = 'update-role-permissions',
  MANAGE_ROLES = 'manage-roles',

  // Order Management
  VIEW_ORDERS = 'view-orders',
  UPDATE_ORDER_STATUS = 'update-order-status',
  DELETE_ORDER = 'delete-order',

  // Delivery Partner Management
  VIEW_DELIVERY_PARTNERS = 'view-delivery-partners',
  MANAGE_DELIVERY_PARTNERS = 'manage-delivery-partners',
}
