import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { prefetchStorageQuarantine } from "@/lib/prefetch/settings-admin";
import { toSearchParams, type RouteSearchParams } from "@/lib/route-search-params";
import { QuarantinePage } from "@/features/settings/storage-quarantine/quarantine-page";
import {
  QUARANTINE_PAGE_SIZE,
  readQuarantineStatus,
} from "@/features/settings/storage-quarantine/quarantine-list-state";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<RouteSearchParams>;
}) {
  await requirePermission("storage:quarantine:view");
  const params = toSearchParams(await searchParams);
  const state = await prefetchStorageQuarantine({
    status: readQuarantineStatus(params.get("status")),
    cursor: undefined,
    limit: QUARANTINE_PAGE_SIZE,
  });
  return (
    <Suspense>
      <HydrationBoundary state={state}>
        <QuarantinePage />
      </HydrationBoundary>
    </Suspense>
  );
}
