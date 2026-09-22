import { redirect } from "next/navigation";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectWorkflowRoute({ params }: PageProps) {
  await enforceRouteAccess("/build/[projectId]/workflow");
  const { projectId } = await params;
  redirect(`/build/${projectId}/settings/workflow`);
}
