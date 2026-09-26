import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ProjectSettingsRetentionPage } from "@/features/build/settings/project-settings-retention-page";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export const metadata = {
  title: "Retention — Project Settings",
};

export default async function ProjectSettingsRetentionRoute({ params }: PageProps) {
  await enforceRouteAccess("/build/[projectId]/settings/retention");
  const { projectId: projectIdStr } = await params;
  const projectId = parseInt(projectIdStr, 10);
  return (
    <Suspense fallback={<Skeleton className="m-6 h-32 w-full" />}>
      <ProjectSettingsRetentionPage projectId={projectId} />
    </Suspense>
  );
}
