"use client";

export type {
  DataScope,
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
  useCreateModuleRoleGroup,
  useRenameModuleRoleGroup,
  useDeleteModuleRoleGroup,
  useSetModuleGroupPermissions,
  useModuleGroupMembers,
  useAddModuleGroupMember,
  useRemoveModuleGroupMember,
} from "./groups";

export {
  useModuleMembersInfinite,
  useAddModuleMember,
  useUpdateModuleMember,
  useRemoveModuleMember,
  useModuleMemberCandidates,
  useModuleMemberGrants,
  useSetModuleMemberGrants,
} from "./members";

export {
  useModuleOwnership,
  useTransferModuleOwnership,
  useCancelModuleOwnershipTransfer,
} from "./ownership";
