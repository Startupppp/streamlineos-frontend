import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { prefetchHrReportingChanges } from "@/lib/prefetch/hr-people";
import { BulkReportingChangePage } from "@/features/hr/reporting-managers/bulk/bulk-reporting-change-page";
import BulkReportingChangeLoading from "./loading";

async function ReportingChangesHydrated() {
  const state = await prefetchHrReportingChanges();
  return (
    <HydrationBoundary state={state}>
      <BulkReportingChangePage />
    </HydrationBoundary>
  );
}

export default async function Page() {
  await requirePermission("hr:reporting-lines:manage");
  return (
    <Suspense fallback={<BulkReportingChangeLoading />}>
      <ReportingChangesHydrated />
    </Suspense>
  );
}
