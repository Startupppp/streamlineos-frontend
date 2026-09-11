import "server-only";

import { getServerAccessResult } from "@/lib/rbac/get-server-access";
import { grantsPermission } from "@/lib/rbac/permission-gate";
import type { PermissionKey } from "@/lib/rbac/permissions";

export interface PrefetchGate {
  can: (permission: PermissionKey) => boolean;
}

// A failed access read denies everything, so a prefetch never calls an endpoint the client would not.
export async function resolvePrefetchGate(): Promise<PrefetchGate> {
  const result = await getServerAccessResult();
  const access = result.ok ? result.access : undefined;
  return { can: (permission) => grantsPermission(access, permission) };
}
