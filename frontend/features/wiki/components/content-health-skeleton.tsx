import { Skeleton } from "@/components/ui/skeleton";

export function SignalRowSkeleton() {
  return (
    <div className="flex h-full min-h-0 items-center gap-3 px-3">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="ml-auto h-4 w-16 shrink-0" />
    </div>
  );
}

export function ContentHealthSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <Skeleton key={index} className="h-16 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-16 shrink-0 rounded-xl" />
      <div className="grid min-h-0 flex-1 auto-rows-[minmax(2.75rem,1fr)] divide-y divide-border/60 overflow-hidden rounded-xl border border-border bg-card">
        {Array.from({ length: 24 }, (_, index) => (
          <SignalRowSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}
