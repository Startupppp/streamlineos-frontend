import { redirect } from "next/navigation";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function AutomationsRoute({ params }: PageProps) {
  await enforceRouteAccess("/build/[projectId]/automations");
  const { projectId: projectIdStr } = await params;
  redirect(`/build/${projectIdStr}/settings/automations`);
}
