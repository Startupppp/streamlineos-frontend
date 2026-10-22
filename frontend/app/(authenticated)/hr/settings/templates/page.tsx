import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { TemplatesSettingsPage } from "@/features/hr/templates/templates-settings-page";
import { prefetchHrTemplates } from "@/lib/prefetch/hr-time";
import TemplatesSettingsLoading from "./loading";

async function TemplatesHydrated() {
  const state = await prefetchHrTemplates();
  return (
    <HydrationBoundary state={state}>
      <TemplatesSettingsPage />
    </HydrationBoundary>
  );
}

export default async function Page() {
  await requirePermission("hr:templates:view");
  return (
    <Suspense fallback={<TemplatesSettingsLoading />}>
      <TemplatesHydrated />
    </Suspense>
  );
}
