import type {
  PermissionRequirement,
  ModuleKey,
} from "@/components/layout/sidebar/sidebar-nav-types";

export interface BackendRouteRef {
  readonly method: "get" | "post" | "put" | "patch" | "delete";
  readonly path: string;
}

export interface RouteAccessExtension {
  readonly prefix: string;
  readonly exact?: boolean;
  readonly descendantsOnly?: boolean;
  readonly module?: ModuleKey;
  readonly permission?: PermissionRequirement;
  readonly reason: string;
  readonly backendRoute?: BackendRouteRef;
}
