import { PageWrapper } from "@/components/ui/page-wrapper";
import { PmPageShell } from "@/components/pm-chrome";
import { WorkflowSkeleton } from "@/features/build/workflow/workflow-skeleton";

export default function ProjectWorkflowLoading() {
  return (
    <PageWrapper title="Workflow" subtitle="Configure allowed status transitions and WIP limits.">
      <PmPageShell>
        <WorkflowSkeleton />
      </PmPageShell>
    </PageWrapper>
  );
}
