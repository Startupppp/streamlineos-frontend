import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";

export default function BiometricLoading() {
  return (
    <PageWrapper
      title="Biometric Integration"
      subtitle="Manage fingerprint/face-recognition devices and attendance sync"
      actions={<Skeleton className="h-9 w-28 rounded-md" />}
    >
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        <div className="flex gap-1">
          <Skeleton className="h-8 w-20 rounded-md" />
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>
        <DataTableSkeleton rows={8} columns={6} />
      </div>
    </PageWrapper>
  );
}
