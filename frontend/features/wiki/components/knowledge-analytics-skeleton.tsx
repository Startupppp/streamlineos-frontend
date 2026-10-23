import { Skeleton } from "@/components/ui/skeleton";

export function AnalyticsSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Skeleton className="h-9 w-full rounded-md sm:w-44" />
        <Skeleton className="h-9 w-full rounded-md sm:w-52" />
        <Skeleton className="h-9 w-40 rounded-md" />
      </div>
      <div className="grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-20 w-full rounded-xl" />
        ))}
      </div>
      <div className="grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-2">
        {Array.from({ length: 2 }, (_, index) => (
          <Skeleton key={index} className="h-20 w-full rounded-xl" />
        ))}
      </div>
      <div className="grid min-h-0 flex-1 gap-4 overflow-hidden lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, section) => (
          <div key={section} className="flex min-h-0 flex-col gap-2 overflow-hidden">
            <Skeleton className="h-4 w-36 shrink-0" />
            <div className="grid min-h-0 flex-1 auto-rows-[minmax(2.25rem,1fr)] gap-2 overflow-hidden">
              {Array.from({ length: 18 }, (_, row) => (
                <Skeleton key={row} className="h-full min-h-0 w-full rounded-md" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
