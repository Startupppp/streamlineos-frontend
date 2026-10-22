import { notFound } from "next/navigation";
import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { CycleDetailPage } from "@/features/build/cycles/cycle-detail-page";
import { prefetchProjectCycles } from "@/lib/prefetch/build";
import CycleDetailLoading from "./loading";

export default async function Page({
  params,
}: {
  params: Promise<{ projectId: string; cycleId: string }>;
}) {
  await enforceRouteAccess("/build/[projectId]/cycles/[cycleId]");
  const { projectId, cycleId } = await params;
  const id = Number(projectId);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const state = await prefetchProjectCycles(id);
  return (
    <Suspense fallback={<CycleDetailLoading />}>
      <HydrationBoundary state={state}>
        <CycleDetailPage projectId={projectId} cycleId={cycleId} />
      </HydrationBoundary>
    </Suspense>
  );
}
