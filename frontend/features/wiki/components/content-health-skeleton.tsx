import { Skeleton } from "@/components/ui/skeleton";

export function SignalRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="ml-auto h-4 w-16 shrink-0" />
    </div>
  );
}

export function ContentHealthSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <Skeleton key={index} className="h-16 rounded-xl" />
        ))}
      </div>
      <div className="divide-y divide-border/60 rounded-xl border border-border bg-card">
        {Array.from({ length: 8 }, (_, index) => (
          <SignalRowSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}
