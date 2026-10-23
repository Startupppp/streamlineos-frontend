import { Skeleton } from "@/components/ui/skeleton";

export function SignalRowSkeleton() {
  return (
    <div className="flex h-full min-h-0 flex-col justify-center gap-2 px-3 py-2 sm:flex-row sm:items-center sm:gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <Skeleton className="h-4 w-4 shrink-0 rounded-sm" />
        <Skeleton className="h-4 min-w-0 flex-1" />
        <Skeleton className="h-4 w-10 shrink-0" />
      </div>
      <div className="flex min-w-0 items-center gap-2 pl-7 sm:ml-auto sm:pl-0">
        <Skeleton className="h-3 w-16 shrink-0" />
        <Skeleton className="h-7 min-w-0 flex-1 rounded-md sm:w-16 sm:flex-none" />
        <Skeleton className="h-7 min-w-0 flex-1 rounded-md sm:w-16 sm:flex-none" />
        <Skeleton className="h-7 w-16 shrink-0 rounded-md" />
      </div>
    </div>
  );
}

export function ContentHealthSkeleton() {
  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-4">
      <div className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <Skeleton key={index} className="h-16 w-full rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-16 w-full shrink-0 rounded-xl" />
      <div className="flex w-full min-w-0 shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          <Skeleton className="h-4 w-32 max-w-full" />
          <Skeleton className="h-3 w-full max-w-sm" />
        </div>
        <Skeleton className="h-8 w-full rounded-md sm:w-44" />
      </div>
      <div className="grid min-h-0 w-full min-w-0 flex-1 auto-rows-[minmax(5.5rem,1fr)] divide-y divide-border/60 overflow-hidden rounded-xl border border-border bg-card sm:auto-rows-[minmax(2.75rem,1fr)]">
        {Array.from({ length: 24 }, (_, index) => (
          <SignalRowSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}
