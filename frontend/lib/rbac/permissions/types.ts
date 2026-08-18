import type { BusinessPermissionKey } from "./permission-key-business";
import type { ExtendedPermissionKey } from "./permission-key-extended";
import type { FoundationPermissionKey } from "./permission-key-foundation";

export type Permission = {
  name: string;
  resource: string;
  action: string;
  description: string;
  baselineScope?: "own" | "all";
};

export type PermissionKey =
  | FoundationPermissionKey
  | BusinessPermissionKey
  | ExtendedPermissionKey;
