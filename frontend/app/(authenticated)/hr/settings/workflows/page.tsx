import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { WorkflowsSettingsPage } from "@/features/hr/workflows/workflows-settings-page";
import { prefetchHrWorkflows } from "@/lib/prefetch/hr-time";
import WorkflowSettingsLoading from "./loading";

async function WorkflowsHydrated() {
  const state = await prefetchHrWorkflows();
  return (
    <HydrationBoundary state={state}>
      <WorkflowsSettingsPage />
    </HydrationBoundary>
  );
}

export default async function Page() {
  await requirePermission("hr:workflows:view");
  return (
    <Suspense fallback={<WorkflowSettingsLoading />}>
      <WorkflowsHydrated />
    </Suspense>
  );
}
