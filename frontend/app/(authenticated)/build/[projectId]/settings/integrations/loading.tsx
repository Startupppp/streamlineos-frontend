import { PageWrapper } from "@/components/ui/page-wrapper";
import { ProjectSettingsPanelSkeleton } from "@/features/build/settings/project-settings-skeleton";

export default function ProjectIntegrationsLoading() {
  return (
    <PageWrapper title="Integrations" subtitle="Connect external services and configure outbound event delivery">
      <ProjectSettingsPanelSkeleton />
    </PageWrapper>
  );
}
