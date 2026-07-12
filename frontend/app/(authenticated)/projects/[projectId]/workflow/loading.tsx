import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table";

export default function WorkflowLoading() {
  return (
    <PageWrapper title="Workflow" eyebrow="Project">
      <div className="px-4 pb-6 space-y-6">
        <DataTableSkeleton rows={4} columns={2} />
        <DataTableSkeleton rows={5} columns={6} />
      </div>
    </PageWrapper>
  );
}
