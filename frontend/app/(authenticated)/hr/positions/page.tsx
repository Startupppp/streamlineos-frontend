import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { prefetchHrPositions } from "@/lib/prefetch/hr-people";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { PositionsPageContent } from "@/features/hr/governance/components/positions-page-content";

async function PositionsHydrated() {
  const state = await prefetchHrPositions();
  return (
    <HydrationBoundary state={state}>
      <PositionsPageContent />
    </HydrationBoundary>
  );
}

export default async function HrPositionsPage() {
  await requirePermission("hr:positions:view");
  return (
    <PageWrapper
      title="Position Control"
      subtitle="Manage org positions, incumbents, and reorg simulations."
    >
      <Suspense fallback={<DataTableSkeleton rows={10} columns={6} />}>
        <PositionsHydrated />
      </Suspense>
    </PageWrapper>
  );
}
