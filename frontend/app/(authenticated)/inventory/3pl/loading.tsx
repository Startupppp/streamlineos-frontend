import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table";

export default function ThreePlLoading() {
  return (
    <PageWrapper
      title="3PL Connections"
      subtitle="Manage third-party logistics provider connections"
      actions={<Skeleton className="h-9 w-36" />}
    >
      <DataTableSkeleton rows={6} className="flex-1 min-h-0" />
    </PageWrapper>
  );
}
