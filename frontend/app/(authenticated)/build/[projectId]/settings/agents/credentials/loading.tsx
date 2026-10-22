import { PageWrapper } from "@/components/ui/page-wrapper";
import { ProjectSettingsPanelSkeleton } from "@/features/build/settings/project-settings-skeleton";

export default function ProjectCredentialsLoading() {
  return (
    <PageWrapper title="Credentials" subtitle="Manage API tokens and secrets for agent access">
      <ProjectSettingsPanelSkeleton />
    </PageWrapper>
  );
}
