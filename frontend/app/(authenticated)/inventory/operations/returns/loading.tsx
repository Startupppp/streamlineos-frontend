import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/ui/data-table";

export default function ReturnsLoading() {
  return (
    <PageWrapper title="Returns">
      <div className="space-y-4">
        <Skeleton className="h-9 w-[240px]" />
        <DataTableSkeleton rows={8} columns={5} />
      </div>
    </PageWrapper>
  );
}
