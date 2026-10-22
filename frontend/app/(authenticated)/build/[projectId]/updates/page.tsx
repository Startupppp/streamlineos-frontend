import { notFound } from "next/navigation";
import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { UpdatesPage } from "@/features/build/updates/updates-page";
import { prefetchProjectUpdates } from "@/lib/prefetch/build-project-extras";
import ProjectUpdatesLoading from "./loading";

export const metadata = {
  title: "Updates | Project",
};

interface Props {
  params: Promise<{ projectId: string }>;
}

async function UpdatesHydrated({ projectId }: { projectId: number }) {
  const state = await prefetchProjectUpdates(projectId);
  return (
    <HydrationBoundary state={state}>
      <UpdatesPage projectId={projectId} />
    </HydrationBoundary>
  );
}

export default async function ProjectUpdatesRoute({ params }: Props) {
  await enforceRouteAccess("/build/[projectId]/updates");
  const { projectId } = await params;
  const parsed = Number(projectId);
  if (!Number.isInteger(parsed) || parsed <= 0) notFound();
  return (
    <Suspense fallback={<ProjectUpdatesLoading />}>
      <UpdatesHydrated projectId={parsed} />
    </Suspense>
  );
}
