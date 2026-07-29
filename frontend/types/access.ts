export type DataScope = "all" | "team" | "own" | "none";

export type Tier = "free" | "starter" | "pro" | "enterprise";

export type RolePrincipalType = "user" | "department";

export interface AccessResponse {
  permissions: string[];
  isOrgOwner: boolean;
  isPlatformAdmin: boolean;
  modules: Record<string, boolean>;
  enabledModules?: string[];
  dataScopes?: Record<string, string>;
  version?: number;
  tier?: Tier;
}

export interface RolePermissionGrant {
  permissionKey: string;
  scope: DataScope;
}

export interface RoleMember {
  id: string;
  principalType: RolePrincipalType;
  principalId: string;
  name: string | null;
  email: string | null;
  image: string | null;
  via: "direct" | "department";
  departmentId: number | null;
  departmentName: string | null;
}

export interface SetRolePermissionsInput {
  roleId: number;
  version: number;
  items: RolePermissionGrant[];
}

export interface AssignRoleMemberInput {
  roleId: number;
  principalType: RolePrincipalType;
  principalId: string | number;
}

export type UnassignRoleMemberInput = AssignRoleMemberInput;
