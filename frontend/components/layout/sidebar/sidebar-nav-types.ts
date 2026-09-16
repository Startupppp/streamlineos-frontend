import type { ComponentType } from "react";
import type { PermissionKey } from "@/lib/rbac/permissions";

export type ProductKey =
  | "home"
  | "crm"
  | "hrms"
  | "build"
  | "timesheets"
  | "inventory"
  | "finance"
  | "helpdesk"
  | "documents"
  | "surveys"
  | "administration"
  | "payroll"
  | "sign"
  | "workflows";

export type PermissionRequirement = PermissionKey | PermissionKey[];

export interface NavRouteAccess {
  matched: boolean;
  module?: ProductKey;
  requiredPermission?: PermissionRequirement;
}

export interface NavRoute {
  label: string;
  icon: ComponentType<{ className?: string }>;
  href: string;
  badge?: "leaves";
  requiredPermission?: PermissionRequirement;
  children?: NavRoute[];
  module?: ProductKey;
  /** Show the route when at least one of these products is enabled. */
  modulesAny?: ProductKey[];
  locked?: boolean;
  exact?: boolean;
  /** Extra owned subpaths, used when a sibling route has a longer prefix. */
  activePrefixes?: string[];
  /** More-specific sibling paths that this route must never highlight. */
  inactivePrefixes?: string[];
}

export interface NavGroup {
  label: string;
  routes: NavRoute[];
  defaultCollapsed?: boolean;
  requiredPermission?: PermissionRequirement;
  /** `product` picks the sidebar and is required; `module` gates entitlement and is not. */
  product: ProductKey;
  module?: ProductKey;
}
