import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";

export function EnvelopeListSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <DataTableSkeleton
        rows={8}
        headers={["Title", "Status", "Sent", "Expires", ""]}
        mobileCards
        className="min-h-0 flex-1"
      />
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <Skeleton className="h-8 w-28 max-w-full rounded-md" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-20 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      </div>
    </div>
  );
}
