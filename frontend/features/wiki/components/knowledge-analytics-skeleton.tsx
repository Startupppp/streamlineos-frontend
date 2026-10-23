import { Skeleton } from "@/components/ui/skeleton";

export function AnalyticsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-20 w-full rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {Array.from({ length: 2 }, (_, index) => (
          <Skeleton key={index} className="h-20 w-full rounded-xl" />
        ))}
      </div>
      {Array.from({ length: 3 }, (_, section) => (
        <div key={section} className="space-y-2">
          <Skeleton className="h-4 w-36" />
          {Array.from({ length: 5 }, (_, row) => (
            <Skeleton key={row} className="h-9 w-full rounded-md" />
          ))}
        </div>
      ))}
    </div>
  );
}
