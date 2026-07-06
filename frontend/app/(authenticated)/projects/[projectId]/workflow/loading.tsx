import { PageWrapper } from "@/components/ui/page-wrapper";
import { SkeletonTable } from "@/components/shared/skeletons/skeleton-table";

export default function WorkflowLoading() {
  return (
    <PageWrapper title="Workflow" eyebrow="Project">
      <div className="px-4 pb-6 space-y-6">
        <SkeletonTable rows={4} columns={2} />
        <SkeletonTable rows={5} columns={6} />
      </div>
    </PageWrapper>
  );
}
