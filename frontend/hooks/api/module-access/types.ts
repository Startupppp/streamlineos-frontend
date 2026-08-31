"use client";

import type { PermissionKey } from "@/lib/rbac/permissions";

export type DataScope = "all" | "team" | "own" | "none";

export interface ModulePermission {
  name: string;
  resource: string;
  action: string;
  description: string;
  scopable?: boolean;
}

export interface ModuleRolePermission {
  permissionKey: string;
  scope: DataScope;
}

export interface ModuleRoleGroup {
  id: number;
  name: string;
  isSystem: boolean;
  version: number;
  memberCount: number;
  permissions: ModuleRolePermission[];
}

export interface ModuleGroupMember {
  userId: string;
  displayName: string;
  email: string;
  avatarUrl?: string | null;
}

export interface ModuleMemberCandidate {
  userId: string;
  displayName: string;
  email: string;
  avatarUrl?: string | null;
}

export interface ModuleOwnership {
  moduleKey: string;
  ownerId: string;
  ownerDisplayName: string;
  ownerEmail: string;
  pendingTransfer?: {
    transferId: string;
    toUserId: string;
    toDisplayName: string;
    toEmail: string;
    initiatedAt: string;
  } | null;
}

export interface ModuleMemberGroup {
  id: number;
  name: string;
}

export interface ModuleMember {
  membershipId: number;
  userId: string;
  displayName: string;
  email: string;
  avatarUrl?: string | null;
  groups: ModuleMemberGroup[];
}

export interface MemberGrant {
  permissionKey: string;
  scope: DataScope;
  reason: string | null;
  createdAt: string;
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: Pagination;
}

export interface CursorPaginatedResult<T> {
  data: T[];
  hasMore: boolean;
  nextCursor: number | null;
}

export interface AuditCursorPage<T> {
  data: T[];
  pagination: {
    limit: number;
    nextCursor: string | null;
    hasMore: boolean;
  };
}

export interface AuditLogEntry {
  id: string | number;
  action: string;
  actorUserId: string;
  actorName: string;
  actorEmail: string;
  targetId: string | null;
  targetType: string | null;
  targetName: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface ModuleMyPermissions {
  permissions: Array<{ key: string; scope: DataScope }>;
  isOrgOwner: boolean;
  isOrgAdmin: boolean;
  isModuleOwner: boolean;
  isModuleAdmin: boolean;
}

export function viewKey(mk: string): PermissionKey {
  return `${mk}:access:view` as PermissionKey;
}

export function manageKey(mk: string): PermissionKey {
  return `${mk}:access:manage` as PermissionKey;
}
