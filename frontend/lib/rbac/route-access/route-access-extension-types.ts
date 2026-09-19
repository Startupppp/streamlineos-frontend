import type {
  PermissionRequirement,
  ProductKey,
} from "@/components/layout/sidebar/sidebar-nav-types";

export interface BackendRouteRef {
  readonly method: "get" | "post" | "put" | "patch" | "delete";
  readonly path: string;
}

export interface RouteAccessExtension {
  readonly prefix: string;
  readonly exact?: boolean;
  readonly descendantsOnly?: boolean;
  readonly product?: ProductKey;
  readonly permission?: PermissionRequirement;
  readonly reason: string;
  // Set it and the suite asserts this operation's backend x-permission equals `permission`.
  readonly backendRoute?: BackendRouteRef;
}
