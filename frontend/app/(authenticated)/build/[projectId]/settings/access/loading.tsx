import { PageWrapper } from "@/components/ui/page-wrapper";
import { PmPageShell } from "@/components/pm-chrome";
import { ProjectAccessSkeleton } from "@/features/build/settings/project-access-skeleton";

export default function ProjectAccessLoading() {
  return (
    <PageWrapper title="Access" subtitle="Manage project membership and roles">
      <PmPageShell>
        <ProjectAccessSkeleton />
      </PmPageShell>
    </PageWrapper>
  );
}
