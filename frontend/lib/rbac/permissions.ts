export type { Permission } from "./permissions/types";
export { HR_PERMISSIONS } from "./permissions/hr";
export { CRM_PERMISSIONS } from "./permissions/crm";
export { SHARED_PERMISSIONS } from "./permissions/shared";
export { KB_PERMISSIONS } from "./permissions/kb";
export { INVENTORY_PERMISSIONS } from "./permissions/inventory";
export { SUPPORT_PERMISSIONS } from "./permissions/support";
export {
  PERMISSIONS,
  SYSTEM_ROLES,
  ROLE_DEFAULT_PERMISSIONS,
  getPermissionName,
  parsePermission,
} from "./permissions/roles";
export type { SystemRole } from "./permissions/roles";
