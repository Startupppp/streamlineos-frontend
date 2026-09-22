import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { AiAssistantPage } from "@/features/build/ai/ai-assistant-page";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectAiRoute({ params }: PageProps) {
  await enforceRouteAccess("/build/[projectId]/ai");
  const { projectId } = await params;
  return <AiAssistantPage projectId={parseInt(projectId, 10)} />;
}
