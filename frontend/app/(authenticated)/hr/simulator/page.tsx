import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { SimulatorPageContent } from "@/features/hr/enterprise/ops/simulator/simulator-page-content";
import { prefetchHrSimulator } from "@/lib/prefetch/hr-ops";
import HrSimulatorLoading from "./loading";

export default async function HrSimulatorPage() {
  await requirePermission("hr:policies:manage");
  const state = await prefetchHrSimulator();
  return (
    <Suspense fallback={<HrSimulatorLoading />}>
      <HydrationBoundary state={state}>
        <SimulatorPageContent />
      </HydrationBoundary>
    </Suspense>
  );
}
