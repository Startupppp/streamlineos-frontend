"use client";

import { ProjectsGitIntegrationSettings } from "@/features/projects/settings/git-integration-settings";
import { AgentTokensSection } from "@/features/projects/settings/agent-tokens-section";

export default function ProjectsIntegrationsPage() {
  return (
    <div className="flex flex-col h-full">
      <ProjectsGitIntegrationSettings />
      <div className="shrink-0 px-4 sm:px-6 pb-6">
        <AgentTokensSection />
      </div>
    </div>
  );
}
