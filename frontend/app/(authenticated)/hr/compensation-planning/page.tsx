import { Suspense } from "react";
import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { CompensationPlanningPage } from "@/features/hr/enterprise/comp/compensation-planning-page";
import CompensationPlanningLoading from "./loading";

async function CompensationPlanningHydrated() {
  await requirePermission("hr:compensation:manage");
  const state = dehydrate(new QueryClient());
  return (
    <HydrationBoundary state={state}>
      <CompensationPlanningPage />
    </HydrationBoundary>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<CompensationPlanningLoading />}>
      <CompensationPlanningHydrated />
    </Suspense>
  );
}
