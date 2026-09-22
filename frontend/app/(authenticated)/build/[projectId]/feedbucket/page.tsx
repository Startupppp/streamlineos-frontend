import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { ProjectFeedbucketPage } from "@/features/build/feedbucket/project-feedbucket-page";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectFeedbackRoute({ params }: PageProps) {
  await enforceRouteAccess("/build/[projectId]/feedbucket");
  const { projectId } = await params;
  return <ProjectFeedbucketPage projectId={Number(projectId)} />;
}
