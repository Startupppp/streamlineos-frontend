import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { CasesPageContent } from "@/features/hr/cases/cases-page-content";
import { prefetchHrCases } from "@/lib/prefetch/hr";
import CasesLoading from "./loading";

export default async function HrCasesPage() {
  await requirePermission("hr:cases:view");
  const state = await prefetchHrCases();
  return (
    <Suspense fallback={<CasesLoading />}>
      <HydrationBoundary state={state}>
        <CasesPageContent />
      </HydrationBoundary>
    </Suspense>
  );
}
