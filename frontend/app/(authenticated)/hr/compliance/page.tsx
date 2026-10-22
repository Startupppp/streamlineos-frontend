import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { CompliancePageContent } from "@/features/hr/global/compliance-page-content";
import { prefetchHrCompliance } from "@/lib/prefetch/hr-ops";
import ComplianceLoading from "./loading";

export default async function CompliancePage() {
  await requirePermission("hr:compliance:manage");
  const state = await prefetchHrCompliance();
  return (
    <Suspense fallback={<ComplianceLoading />}>
      <HydrationBoundary state={state}>
        <CompliancePageContent />
      </HydrationBoundary>
    </Suspense>
  );
}
