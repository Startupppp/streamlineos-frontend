export type { Permission } from "./permissions/types";
export { HR_PERMISSIONS } from "./permissions/hr";
export { CRM_PERMISSIONS } from "./permissions/crm";
export { SHARED_PERMISSIONS } from "./permissions/shared";
export {
  PERMISSIONS,
  SYSTEM_ROLES,
  ROLE_DEFAULT_PERMISSIONS,
  getPermissionName,
  parsePermission,
} from "./permissions/roles";
export type { SystemRole } from "./permissions/roles";
