import { PageWrapper } from "@/components/ui/page-wrapper";
import { ProjectSettingsPanelSkeleton } from "@/features/build/settings/project-settings-skeleton";

export default function ProjectViewsLoading() {
  return (
    <PageWrapper title="Saved Views" subtitle="Manage shared filters and layouts for project issue lists">
      <ProjectSettingsPanelSkeleton />
    </PageWrapper>
  );
}
