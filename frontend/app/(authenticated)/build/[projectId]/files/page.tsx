import { notFound } from "next/navigation";
import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { FilesPage } from "@/features/build/files/files-page";
import { prefetchProjectFiles } from "@/lib/prefetch/build-project-extras";
import ProjectFilesLoading from "./loading";

export const metadata = {
  title: "Files | Project",
};

interface Props {
  params: Promise<{ projectId: string }>;
}

async function FilesHydrated({ projectId }: { projectId: number }) {
  const state = await prefetchProjectFiles(projectId);
  return (
    <HydrationBoundary state={state}>
      <FilesPage projectId={projectId} />
    </HydrationBoundary>
  );
}

export default async function ProjectFilesRoute({ params }: Props) {
  await enforceRouteAccess("/build/[projectId]/files");
  const { projectId } = await params;
  const parsed = Number(projectId);
  if (!Number.isInteger(parsed) || parsed <= 0) notFound();
  return (
    <Suspense fallback={<ProjectFilesLoading />}>
      <FilesHydrated projectId={parsed} />
    </Suspense>
  );
}
