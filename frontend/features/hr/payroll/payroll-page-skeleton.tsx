import { Skeleton } from "@/components/ui/skeleton";

export function PayrollPageSkeleton() {
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="shrink-0 px-4 sm:px-6 pt-4 pb-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-3.5 w-56" />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Skeleton className="h-9 w-[120px]" />
            <Skeleton className="h-9 w-[160px]" />
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-32" />
          </div>
        </div>
      </div>

      <div className="shrink-0 mx-4 sm:mx-6 h-px bg-border" />

      <div className="px-4 sm:px-6 pt-3 pb-6 space-y-4">
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2 flex-1 min-w-0">
                  <Skeleton className="h-2.5 w-20" />
                  <Skeleton className="h-7 w-32" />
                </div>
                <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="px-4 py-3.5 border-b border-border flex items-center justify-between">
            <div className="space-y-1">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-56" />
            </div>
          </div>

          <div className="bg-muted/40 px-4 py-2.5 flex items-center gap-4 border-b border-border">
            {["w-28", "w-24", "w-20", "w-20", "w-16", "w-16", "w-24"].map((w, i) => (
              <Skeleton key={i} className={`h-3 ${w}`} />
            ))}
          </div>

          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 px-4 py-3 border-b border-border/50 last:border-0"
            >
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <Skeleton className="h-7 w-7 rounded-lg shrink-0" />
                <div className="space-y-1 min-w-0">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-2.5 w-20" />
                </div>
              </div>
              <Skeleton className="h-3.5 w-20 shrink-0" />
              <Skeleton className="h-3.5 w-16 shrink-0" />
              <Skeleton className="h-3.5 w-20 shrink-0" />
              <Skeleton className="h-5 w-16 rounded-full shrink-0" />
              <Skeleton className="h-7 w-20 rounded-lg shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
