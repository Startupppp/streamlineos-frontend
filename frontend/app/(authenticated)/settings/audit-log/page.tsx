import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { AuditLogPage } from "@/features/settings/audit-log/audit-log-page";
import { readAuditLogFilters } from "@/features/settings/audit-log/audit-log-constants";
import { toSearchParams, type RouteSearchParams } from "@/lib/route-search-params";
import { prefetchSettingsAuditLog } from "@/lib/prefetch/settings-admin";

export default async function AuditLogRoute({
  searchParams,
}: {
  searchParams: Promise<RouteSearchParams>;
}) {
  await requirePermission("audit-log:read");
  const params = toSearchParams(await searchParams);
  const state = await prefetchSettingsAuditLog(readAuditLogFilters(params));
  return (
    <Suspense>
      <HydrationBoundary state={state}>
        <AuditLogPage />
      </HydrationBoundary>
    </Suspense>
  );
}
