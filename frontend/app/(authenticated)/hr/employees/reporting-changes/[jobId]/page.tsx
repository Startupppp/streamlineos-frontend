import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/rbac/require-permission";
import { prefetchHrReportingChangesJob } from "@/lib/prefetch/hr-people";
import { BulkJobDetailPage } from "@/features/hr/reporting-managers/bulk/bulk-job-detail-page";
import BulkJobLoading from "./loading";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function BulkJobDetailHydrated({ jobId }: { jobId: string }) {
  const state = await prefetchHrReportingChangesJob(jobId);
  return (
    <HydrationBoundary state={state}>
      <BulkJobDetailPage jobId={jobId} />
    </HydrationBoundary>
  );
}

export default async function Page({ params }: { params: Promise<{ jobId: string }> }) {
  await requirePermission("hr:reporting-lines:manage");
  const { jobId } = await params;
  if (!UUID.test(jobId)) notFound();
  return (
    <Suspense fallback={<BulkJobLoading />}>
      <BulkJobDetailHydrated jobId={jobId} />
    </Suspense>
  );
}
