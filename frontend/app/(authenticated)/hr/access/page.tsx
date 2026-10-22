import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { prefetchHrModuleAccess } from "@/lib/prefetch/hr-people";
import { ModuleAccessPage } from "@/features/module-access/module-access-page";
import HrAccessLoading from "./loading";

async function HrAccessHydrated() {
  const state = await prefetchHrModuleAccess();
  return (
    <HydrationBoundary state={state}>
      <ModuleAccessPage moduleKey="hr" title="HR Access" />
    </HydrationBoundary>
  );
}

export default async function HrAccessRoute() {
  await requirePermission("hr:access:view");
  return (
    <Suspense fallback={<HrAccessLoading />}>
      <HrAccessHydrated />
    </Suspense>
  );
}
