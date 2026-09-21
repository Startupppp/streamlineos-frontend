import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { ProjectWebhooksPage } from "@/features/build/webhooks/project-webhooks-page";

export default async function Page({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  await enforceRouteAccess("/build/[projectId]/webhooks");
  const { projectId } = await params;
  return <ProjectWebhooksPage projectId={projectId} />;
}
