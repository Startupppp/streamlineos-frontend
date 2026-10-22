export type {
  AccessResponse,
  DataScope,
} from "@/hooks/api/access-schema";

import type { DataScope } from "@/hooks/api/access-schema";

export type RolePrincipalType = "user" | "group";

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
  via: "direct" | "group";
  groupId: string | null;
  groupName: string | null;
}

export interface SetRolePermissionsInput {
  roleId: number;
  version: number;
  items: RolePermissionGrant[];
}

export interface AssignRoleMemberInput {
  roleId: number;
  principalType: RolePrincipalType;
  principalId: string;
}

