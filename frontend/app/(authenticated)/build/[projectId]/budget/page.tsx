import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { ProjectBudgetPage } from "@/features/build/project-detail/project-budget-page";
import { prefetchProjectBudget } from "@/lib/prefetch/build-project-extras";
import BudgetLoading from "./loading";

async function BudgetHydrated({ projectId }: { projectId: number }) {
  const state = await prefetchProjectBudget(projectId);
  return (
    <HydrationBoundary state={state}>
      <ProjectBudgetPage projectId={String(projectId)} />
    </HydrationBoundary>
  );
}

export default async function Page({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  await enforceRouteAccess("/build/[projectId]/budget");
  const { projectId } = await params;
  return (
    <Suspense fallback={<BudgetLoading />}>
      <BudgetHydrated projectId={parseInt(projectId, 10)} />
    </Suspense>
  );
}
