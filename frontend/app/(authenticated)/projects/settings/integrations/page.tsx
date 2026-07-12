"use client";

import { ProjectsGitIntegrationSettings } from "@/features/projects/settings/git-integration-settings";
import { AgentTokensSection } from "@/features/projects/settings/agent-tokens-section";

export default function ProjectsIntegrationsPage() {
  return <ProjectsGitIntegrationSettings footer={<AgentTokensSection />} />;
}
