import { Skeleton } from "@/components/ui/skeleton";

export function PageHistorySkeleton() {
  return (
    <div className="flex h-full min-h-0 flex-col gap-4 md:flex-row">
      <div className="flex h-56 w-full shrink-0 flex-col overflow-hidden rounded-xl border border-border bg-card md:h-full md:w-72 lg:w-80">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-20 rounded-md" />
        </div>
        <div className="space-y-2 p-3">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-14 w-full rounded-md" />
          ))}
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-4 rounded-xl border border-border bg-card p-4">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    </div>
  );
}
