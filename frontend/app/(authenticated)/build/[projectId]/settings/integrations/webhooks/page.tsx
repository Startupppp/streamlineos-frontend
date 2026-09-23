import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { ProjectWebhooksPage } from "@/features/build/webhooks/project-webhooks-page";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectSettingsIntegrationsWebhooksRoute({
  params,
}: PageProps) {
  await enforceRouteAccess("/build/[projectId]/settings/integrations/webhooks");
  const { projectId } = await params;
  return <ProjectWebhooksPage projectId={projectId} />;
}
