import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export function KbSharingSettingsSkeleton() {
  return (
    <div className="flex max-w-lg flex-col gap-6">
      <div className="flex flex-col gap-4">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-9 w-full rounded-md" />
          </div>
        ))}
        {Array.from({ length: 2 }, (_, index) => (
          <div key={index} className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded-md" />
            <Skeleton className="h-4 w-52" />
          </div>
        ))}
        <Skeleton className="h-9 w-32 rounded-md" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-36" />
        <DataTableSkeleton columns={5} mobileCards />
      </div>
    </div>
  );
}
