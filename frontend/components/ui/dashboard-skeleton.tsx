import { Skeleton } from "./skeleton";

export function DashboardStatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="relative rounded-xl border border-border bg-card p-3.5 overflow-hidden"
        >
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-blue-500/30" />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-5 w-16" />
            </div>
            <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
          </div>
        </div>
      ))}
    </div>
  );
}
