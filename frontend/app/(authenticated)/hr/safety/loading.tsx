import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/ui/data-table";

export default function HrSafetyLoading() {
  return (
    <PageWrapper
      title="Health, Safety & Wellness"
      subtitle="Track workplace incidents and monitor employee wellbeing"
      actions={<Skeleton className="h-9 w-36 rounded-md" />}
      filters={
        <div className="flex min-w-0 flex-nowrap items-center gap-2 overflow-x-auto [&>*]:shrink-0">
          <Skeleton className="h-8 w-44 rounded-md" />
          <Skeleton className="h-8 w-40 rounded-md" />
          <Skeleton className="h-8 w-36 rounded-md" />
        </div>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col pb-6">
        <div className="flex items-center gap-1 border-b mb-4">
          <Skeleton className="h-8 w-20 rounded-none" />
          <Skeleton className="h-8 w-20 rounded-none" />
        </div>
        <DataTableSkeleton rows={12} columns={6} />
      </div>
    </PageWrapper>
  );
}
