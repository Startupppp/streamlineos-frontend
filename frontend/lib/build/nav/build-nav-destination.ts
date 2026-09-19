import type { ComponentType } from "react";
import type { PermissionKey } from "@/lib/rbac/permissions";
import type { BuildScope } from "../build-scope";

export const BUILD_NAV_MAX_PINS = 3;
export const BUILD_NAV_MAX_PRIMARY = 9;

export const BUILD_FEEDBACK_ORG_MODULE = "feedbucket";

export type BuildNavBadge = "inbox-unread";

export interface BuildNavDestination {
  id: string;
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  requiredPermission: PermissionKey | PermissionKey[];
  requiredOrgModule?: string;
  requiredCapability?: BuildNavCapability;
  exact?: boolean;
  boardViews?: boolean;
  badge?: BuildNavBadge;
  mobilePriority?: number;
}

export type BuildNavCapability = "client-portal";

export type BuildCreateActionId = "issue" | "project" | "managed-product";

export interface BuildCreateAction {
  id: BuildCreateActionId;
  label: string;
  requiredPermission: PermissionKey;
}

export interface BuildNavAccess {
  can: (permission: PermissionKey) => boolean;
  isOrgModuleEnabled: (orgModuleKey: string) => boolean;
  isCapabilityEnabled: (capability: BuildNavCapability) => boolean;
}

export interface BuildNavModelInput {
  scope: BuildScope;
  access: BuildNavAccess;
  pinnedIds: readonly string[];
}

export interface BuildNavModel {
  scope: BuildScope;
  myWork: BuildNavDestination[];
  primary: BuildNavDestination[];
  pinned: BuildNavDestination[];
  moreTools: BuildNavDestination[];
  settings: BuildNavDestination | null;
  browseAll: BuildNavDestination | null;
  createActions: BuildCreateAction[];
}

export interface BuildScopeCatalog {
  primary: BuildNavDestination[];
  moreTools: BuildNavDestination[];
  settings: BuildNavDestination | null;
}
