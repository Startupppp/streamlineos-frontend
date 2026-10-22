import { PageWrapper } from "@/components/ui/page-wrapper";
import { ProjectSettingsPanelSkeleton } from "@/features/build/settings/project-settings-skeleton";

export default function ProjectPortalLoading() {
  return (
    <PageWrapper title="Client Portal" subtitle="Control which tickets and milestones are visible to external clients">
      <ProjectSettingsPanelSkeleton tall />
    </PageWrapper>
  );
}
