export type DataScope = "all" | "team" | "own" | "none";

export type Tier = "free" | "starter" | "pro" | "enterprise";

export type RolePrincipalType = "user" | "department";

export interface MfaState {
  enforced: boolean;
  satisfied: boolean;
}

export interface AccessResponse {
  scopes: Record<string, DataScope>;
  isOrgOwner: boolean;
  canManageOrganizationMembership: boolean;
  modules: Record<string, boolean>;
  mfa?: MfaState;
  enabledModules?: string[];
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

export interface RbacDiscoveryGrantable {
  grantableKeys: string[];
  assignableRanks: number[];
  allowedModules: string[] | null;
}

export interface RbacDiscoveryMember {
  userId: string;
  name: string | null;
  email: string;
}

export interface AssignRoleMemberInput {
  roleId: number;
  principalType: RolePrincipalType;
  principalId: string;
}

export type UnassignRoleMemberInput = AssignRoleMemberInput;
