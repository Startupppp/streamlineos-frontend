import { PageWrapper } from "@/components/ui/page-wrapper";
import { ProjectSettingsPanelSkeleton } from "@/features/build/settings/project-settings-skeleton";

export default function ProjectAgentsLoading() {
  return (
    <PageWrapper title="Agents" subtitle="Configure AI agents and their access to this project">
      <ProjectSettingsPanelSkeleton />
    </PageWrapper>
  );
}
