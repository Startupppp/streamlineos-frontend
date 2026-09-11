import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { SimulatePage } from "@/features/settings/simulate/simulate-page";
import { prefetchRoleSimulation } from "@/lib/prefetch/settings-admin";

export default async function SimulateRoute() {
  await requirePermission("settings:rbac:manage");
  const state = await prefetchRoleSimulation();
  return (
    <Suspense>
      <HydrationBoundary state={state}>
        <SimulatePage />
      </HydrationBoundary>
    </Suspense>
  );
}
