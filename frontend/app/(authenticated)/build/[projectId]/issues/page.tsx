import { notFound } from "next/navigation";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { ProjectBoardPage } from "@/features/build/project-detail/project-board-page";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectIssuesRoute({ params }: PageProps) {
  await enforceRouteAccess("/build/[projectId]/issues");
  const { projectId } = await params;
  const id = Number(projectId);
  if (!Number.isInteger(id) || id <= 0) notFound();
  return <ProjectBoardPage params={params} />;
}
