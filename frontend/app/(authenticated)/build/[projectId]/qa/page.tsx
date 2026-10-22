import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { QaPage } from "@/features/build/qa/qa-page";
import { prefetchProjectQa } from "@/lib/prefetch/build-project-extras";
import ProjectQaLoading from "./loading";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

async function QaHydrated({ projectId }: { projectId: number }) {
  const state = await prefetchProjectQa(projectId);
  return (
    <HydrationBoundary state={state}>
      <QaPage projectId={projectId} />
    </HydrationBoundary>
  );
}

export default async function QaRoute({ params }: PageProps) {
  await enforceRouteAccess("/build/[projectId]/qa");
  const { projectId: projectIdStr } = await params;
  return (
    <Suspense fallback={<ProjectQaLoading />}>
      <QaHydrated projectId={parseInt(projectIdStr, 10)} />
    </Suspense>
  );
}
