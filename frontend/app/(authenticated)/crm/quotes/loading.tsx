import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/ui/data-table";

export default function QuotesLoading() {
  return (
    <PageWrapper
      title="Quotes"
      subtitle="Quote management"
      filters={
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-56 rounded-md" />
          <Skeleton className="h-9 w-36 rounded-md" />
        </div>
      }
    >
      <DataTableSkeleton
        rows={12}
        columns={8}
        className="flex-1 min-h-0"
      />
    </PageWrapper>
  );
}
