import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { ContingentPageContent } from "@/features/hr/global/contingent-page-content";
import { prefetchHrContingent } from "@/lib/prefetch/hr-ops";
import ContingentLoading from "./loading";

export default async function ContingentPage() {
  await requirePermission("hr:contracts:view");
  const state = await prefetchHrContingent();
  return (
    <Suspense fallback={<ContingentLoading />}>
      <HydrationBoundary state={state}>
        <ContingentPageContent />
      </HydrationBoundary>
    </Suspense>
  );
}
