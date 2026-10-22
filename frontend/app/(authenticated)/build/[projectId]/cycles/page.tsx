import { notFound } from "next/navigation";
import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { CyclesPage } from "@/features/build/cycles/cycles-page";
import { prefetchProjectCycles } from "@/lib/prefetch/build";
import CyclesLoading from "./loading";

interface Props {
  params: Promise<{ projectId: string }>;
}

export default async function CyclesRoute({ params }: Props) {
  await enforceRouteAccess("/build/[projectId]/cycles");
  const { projectId: projectIdStr } = await params;
  const projectId = parseInt(projectIdStr);
  if (!Number.isInteger(projectId) || projectId <= 0) notFound();
  const state = await prefetchProjectCycles(projectId);
  return (
    <Suspense fallback={<CyclesLoading />}>
      <HydrationBoundary state={state}>
        <CyclesPage projectId={projectId} />
      </HydrationBoundary>
    </Suspense>
  );
}
