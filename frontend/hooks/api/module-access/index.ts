"use client";

export type { DataScope } from "@/hooks/api/access-schema";

export type {
  ModulePermission,
  ModuleRolePermission,
  ModuleRoleGroup,
  ModuleGroupMember,
  ModuleMemberCandidate,
  ModuleOwnership,
  ModuleMemberGroup,
  ModuleMember,
  MemberGrant,
  Pagination,
  PaginatedResult,
  CursorPaginatedResult,
  AuditCursorPage,
  AuditLogEntry,
  ModuleMyPermissions,
} from "./types";

export {
  useModuleAccessCatalog,
  useModuleMyPermissions,
  useModuleAuditLog,
} from "./catalog";

export {
  useModuleRoleGroups,
  useRenameModuleRoleGroup,
  useDeleteModuleRoleGroup,
  useModuleGroupMembers,
  useAddModuleGroupMember,
  useRemoveModuleGroupMember,
} from "./groups";

export {
  useModuleMembersInfinite,
  useAddModuleMember,
  useUpdateModuleMember,
  useRemoveModuleMember,
  useModuleMemberGrants,
  useSetModuleMemberGrants,
} from "./members";

export {
  useModuleOwnership,
  useTransferModuleOwnership,
  useCancelModuleOwnershipTransfer,
} from "./ownership";
