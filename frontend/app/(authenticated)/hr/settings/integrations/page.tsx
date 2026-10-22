import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { HrIntegrationsSettings } from "@/features/hr/settings/hr-integrations/hr-integrations-settings";
import { prefetchHrWebhooks } from "@/lib/prefetch/hr-time";
import IntegrationsSettingsLoading from "./loading";

async function IntegrationsHydrated() {
  const state = await prefetchHrWebhooks();
  return (
    <HydrationBoundary state={state}>
      <HrIntegrationsSettings />
    </HydrationBoundary>
  );
}

export default async function HrIntegrationsPage() {
  await requirePermission("hr:integrations:manage");
  return (
    <Suspense fallback={<IntegrationsSettingsLoading />}>
      <IntegrationsHydrated />
    </Suspense>
  );
}
