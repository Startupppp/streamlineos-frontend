import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/ui/data-table";

export default function PersonalApiTokensLoading() {
  return (
    <PageWrapper
      title="Personal Access Tokens"
      subtitle="Create credentials that act only with your current, explicitly selected access."
      actions={<Skeleton className="h-9 w-28 rounded-md" />}
    >
      <DataTableSkeleton rows={8} columns={6} />
    </PageWrapper>
  );
}
