import { redirect } from "next/navigation";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectWebhooksRedirectRoute({ params }: PageProps) {
  await enforceRouteAccess("/build/[projectId]/webhooks");
  const { projectId } = await params;
  redirect(`/build/${projectId}/settings/integrations/webhooks`);
}
