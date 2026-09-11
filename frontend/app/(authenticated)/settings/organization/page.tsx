import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { OrganizationSettingsPage } from "@/features/settings/organization/organization-settings-page";
import { prefetchOrgSettings } from "@/lib/prefetch/settings";

export default async function OrganizationSettingsRoute() {
  await requirePermission("settings:view");
  const state = await prefetchOrgSettings();
  return (
    <Suspense>
      <HydrationBoundary state={state}>
        <OrganizationSettingsPage />
      </HydrationBoundary>
    </Suspense>
  );
}
