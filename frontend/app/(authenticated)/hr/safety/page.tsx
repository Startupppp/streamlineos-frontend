import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { SafetyPageContent } from "@/features/hr/safety/safety-page-content";
import { prefetchHrSafety } from "@/lib/prefetch/hr";
import SafetyLoading from "./loading";

export default async function HrSafetyPage() {
  await requirePermission("hr:safety:view");
  const state = await prefetchHrSafety();
  return (
    <Suspense fallback={<SafetyLoading />}>
      <HydrationBoundary state={state}>
        <SafetyPageContent />
      </HydrationBoundary>
    </Suspense>
  );
}
