import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { LegalHoldsTable } from "@/features/hr/governance/components/legal-holds-table";
import { prefetchHrLegalHolds } from "@/lib/prefetch/hr-ops";
import LegalHoldsLoading from "./loading";

export default async function HrLegalHoldsPage() {
  await requirePermission("hr:legalhold:view");
  const state = await prefetchHrLegalHolds();
  return (
    <Suspense fallback={<LegalHoldsLoading />}>
      <HydrationBoundary state={state}>
        <PageWrapper
          title="Legal Holds"
          subtitle="Manage investigation locks and data preservation orders."
        >
          <LegalHoldsTable />
        </PageWrapper>
      </HydrationBoundary>
    </Suspense>
  );
}
