/**
 * The response shapes are `z.infer`red from the contracts that validate them at
 * the fetch seam (`hooks/api/access-schema.ts`), so there is one definition of
 * each and it is the one enforced at runtime.
 */
export type {
  AccessResponse,
  DataScope,
} from "@/hooks/api/access-schema";

import type { DataScope } from "@/hooks/api/access-schema";

export type RolePrincipalType = "user" | "department";

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
  principalId: string;
}

export type UnassignRoleMemberInput = AssignRoleMemberInput;
