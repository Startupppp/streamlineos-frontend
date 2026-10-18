import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";

export default function PersonalApiTokensLoading() {
  return (
    <PageWrapper
      title="Personal Access Tokens"
      subtitle="Create credentials that act only with your current, explicitly selected access."
      noInternalScroll
      contentClassName="flex min-h-0 flex-1 flex-col"
      actions={<Skeleton className="h-9 w-28 rounded-md" />}
    >
      <DataTableSkeleton fill columns={6} />
    </PageWrapper>
  );
}
