import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { prefetchHrGoals } from "@/lib/prefetch/hr-talent";
import { GoalsPage } from "@/features/hr/goals/goals-page";
import GoalsLoading from "./loading";

async function GoalsHydrated() {
  await requirePermission("hr:performance:view");
  const state = await prefetchHrGoals();
  return (
    <HydrationBoundary state={state}>
      <GoalsPage />
    </HydrationBoundary>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<GoalsLoading />}>
      <GoalsHydrated />
    </Suspense>
  );
}
