import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export function SpaceDetailSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex items-start gap-4 rounded-xl border border-border bg-card p-4">
        <Skeleton className="h-10 w-10 shrink-0 rounded-md" />
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-5 w-20 rounded-md" />
          </div>
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <div className="flex min-h-0 flex-1 gap-4">
        <div className="hidden w-56 shrink-0 flex-col gap-2 rounded-xl border border-border bg-card/50 p-3 md:flex">
          <Skeleton className="h-4 w-24" />
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-8 w-full rounded-md" />
          ))}
        </div>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-9 w-full rounded-md sm:w-64" />
            <Skeleton className="h-9 w-28 rounded-md" />
          </div>
          <DataTableSkeleton columns={5} mobileCards fill />
        </div>
      </div>
    </div>
  );
}
