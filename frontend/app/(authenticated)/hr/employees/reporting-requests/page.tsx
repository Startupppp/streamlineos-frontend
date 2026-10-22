import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { prefetchHrReportingRequests } from "@/lib/prefetch/hr-people";
import { ReportingRequestsPage } from "@/features/hr/reporting-managers/requests/reporting-requests-page";
import ReportingRequestsLoading from "./loading";

async function ReportingRequestsHydrated() {
  const state = await prefetchHrReportingRequests();
  return (
    <HydrationBoundary state={state}>
      <ReportingRequestsPage />
    </HydrationBoundary>
  );
}

export default async function Page() {
  await requirePermission("hr:reporting-lines:review");
  return (
    <Suspense fallback={<ReportingRequestsLoading />}>
      <ReportingRequestsHydrated />
    </Suspense>
  );
}
