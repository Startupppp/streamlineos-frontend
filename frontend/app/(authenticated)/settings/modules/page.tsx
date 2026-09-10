import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { ModulesPage } from "@/features/settings/modules/modules-page";
import { prefetchOrgModules } from "@/lib/prefetch/settings-admin";

export default async function ModulesRoute() {
  await requirePermission("settings:manage");
  const state = await prefetchOrgModules();
  return (
    <Suspense>
      <HydrationBoundary state={state}>
        <ModulesPage />
      </HydrationBoundary>
    </Suspense>
  );
}
