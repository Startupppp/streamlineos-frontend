"use client";

import { ProjectsGitIntegrationSettings } from "@/features/build/settings/git-integration-settings";
import { AgentTokensSection } from "@/features/build/settings/agent-tokens-section";

export default function ProjectsIntegrationsPage() {
  return <ProjectsGitIntegrationSettings footer={<AgentTokensSection />} />;
}
