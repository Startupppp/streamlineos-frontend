import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { EmergencyPageContent } from "@/features/hr/enterprise/ops/emergency/emergency-page-content";
import { prefetchHrEmergency } from "@/lib/prefetch/hr-ops";
import EmergencyLoading from "./loading";

export default async function HrEmergencyPage() {
  await requirePermission("hr:emergency:manage");
  const state = await prefetchHrEmergency();
  return (
    <Suspense fallback={<EmergencyLoading />}>
      <HydrationBoundary state={state}>
        <EmergencyPageContent />
      </HydrationBoundary>
    </Suspense>
  );
}
