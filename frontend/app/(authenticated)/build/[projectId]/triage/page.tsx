import { notFound } from "next/navigation";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { TriagePage } from "@/features/build/triage/triage-page";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectTriagePage({ params }: PageProps) {
  await enforceRouteAccess("/build/[projectId]/triage");
  const { projectId: projectIdStr } = await params;
  const projectId = parseInt(projectIdStr, 10);

  if (isNaN(projectId)) notFound();

  return <TriagePage projectId={projectId} />;
}
