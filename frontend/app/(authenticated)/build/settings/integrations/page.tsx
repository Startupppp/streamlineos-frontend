import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { ProjectsGitIntegrationSettings } from "@/features/build/settings/git-integration-settings";
import { AgentTokensSection } from "@/features/build/settings/agent-tokens-section";

export default async function ProjectsIntegrationsPage() {
  await enforceRouteAccess("/build/settings/integrations");
  return <ProjectsGitIntegrationSettings footer={<AgentTokensSection />} />;
}
