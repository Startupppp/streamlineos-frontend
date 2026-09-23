import { notFound } from "next/navigation";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { ProjectOverviewPage } from "@/features/build/overview/project-overview-page";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectOverviewRoute({ params }: PageProps) {
  await enforceRouteAccess("/build/[projectId]");
  const { projectId } = await params;
  const id = Number(projectId);
  if (!Number.isInteger(id) || id <= 0) notFound();
  return <ProjectOverviewPage projectId={id} />;
}
