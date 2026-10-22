import { PageWrapper } from "@/components/ui/page-wrapper";
import { ProjectSettingsPanelSkeleton } from "@/features/build/settings/project-settings-skeleton";

export default function ProjectIterationsLoading() {
  return (
    <PageWrapper title="Iterations" subtitle="Configure default cadence and naming for project cycles">
      <ProjectSettingsPanelSkeleton />
    </PageWrapper>
  );
}
