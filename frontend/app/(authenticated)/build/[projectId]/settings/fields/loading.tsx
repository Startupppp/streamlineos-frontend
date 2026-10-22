import { PageWrapper } from "@/components/ui/page-wrapper";
import { ProjectSettingsPanelSkeleton } from "@/features/build/settings/project-settings-skeleton";

export default function ProjectFieldsLoading() {
  return (
    <PageWrapper title="Custom Fields" subtitle="Define additional data fields for tickets in this project">
      <ProjectSettingsPanelSkeleton />
    </PageWrapper>
  );
}
