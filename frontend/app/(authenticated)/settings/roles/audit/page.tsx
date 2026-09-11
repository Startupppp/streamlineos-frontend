import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { RolesAuditPage } from "@/features/settings/roles/roles-audit-page";
import { RBAC_AUDIT_INITIAL_FILTERS } from "@/features/settings/roles/roles-audit-constants";
import { prefetchRolesAudit } from "@/lib/prefetch/settings-admin";

export default async function RolesAuditRoute() {
  await requirePermission("audit-log:read");
  const state = await prefetchRolesAudit(RBAC_AUDIT_INITIAL_FILTERS);
  return (
    <Suspense>
      <HydrationBoundary state={state}>
        <RolesAuditPage />
      </HydrationBoundary>
    </Suspense>
  );
}
