import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function BackgroundVerificationLoading() {
  return (
    <PageWrapper
      title="Background Verification"
      subtitle="Initiate, track employee background checks, and view candidate compliance"
      actions={<Skeleton className="h-9 w-36 rounded-md" />}
    >
      <div className="flex flex-col flex-1 min-h-0 gap-4">
        <Skeleton className="h-9 w-64 rounded-md" />
        <DataTableSkeleton rows={12} columns={7} className="flex-1 min-h-0" />
      </div>
    </PageWrapper>
  );
}
