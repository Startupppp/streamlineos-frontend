import { PageWrapper } from "@/components/ui/page-wrapper";
import { SkeletonTable } from "@/components/shared/skeletons/skeleton-table";

export default function ClientPortalLoading() {
  return (
    <PageWrapper title="Client Portal" subtitle="Loading...">
      <div className="px-4 pb-4">
        <SkeletonTable rows={6} columns={3} />
      </div>
    </PageWrapper>
  );
}
