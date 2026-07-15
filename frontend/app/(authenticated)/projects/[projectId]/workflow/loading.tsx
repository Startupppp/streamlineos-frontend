import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { PmPageShell, PmSection } from "@/features/projects/shared/pm-chrome";

export default function WorkflowLoading() {
  return (
    <PageWrapper title="Workflow" eyebrow="Project">
      <PmPageShell>
        <PmSection index={0} className="flex min-h-0 flex-1 flex-col gap-4">
          <DataTableSkeleton rows={12} columns={2} className="flex-1" />
          <DataTableSkeleton rows={12} columns={6} className="flex-1" />
        </PmSection>
      </PmPageShell>
    </PageWrapper>
  );
}
