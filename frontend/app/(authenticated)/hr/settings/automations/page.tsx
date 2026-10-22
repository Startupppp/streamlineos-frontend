import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { AutomationsSettingsPage } from "@/features/hr/automations/automations-settings-page";
import { prefetchHrAutomations } from "@/lib/prefetch/hr-time";
import AutomationsSettingsLoading from "./loading";

async function AutomationsHydrated() {
  const state = await prefetchHrAutomations();
  return (
    <HydrationBoundary state={state}>
      <AutomationsSettingsPage />
    </HydrationBoundary>
  );
}

export default async function Page() {
  await requirePermission("hr:automations:view");
  return (
    <Suspense fallback={<AutomationsSettingsLoading />}>
      <AutomationsHydrated />
    </Suspense>
  );
}
