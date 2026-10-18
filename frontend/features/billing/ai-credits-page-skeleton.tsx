import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";

export function AiCreditsPageSkeleton() {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      <Skeleton className="h-9 w-full max-w-[360px] shrink-0 rounded-lg" />

      <div className="flex min-h-0 flex-1 basis-0 flex-col gap-4 overflow-hidden">
        <div className="flex shrink-0 flex-col gap-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-col gap-1">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-40" />
              </div>
              <Skeleton className="h-9 w-32 rounded-md" />
            </div>
            <StatCardGridSkeleton cols={3} count={3} />
          </div>

          <div className="grid gap-4 md:grid-cols-2 md:items-stretch">
            {["By model", "By feature"].map((title) => (
              <div
                key={title}
                className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card"
              >
                <div className="border-b border-border px-4 py-3">
                  <p className="text-sm font-semibold text-foreground">{title}</p>
                </div>
                <div>
                  {Array.from({ length: 3 }, (_, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-4 border-b border-border px-4 py-3 last:border-b-0"
                    >
                      <div className="flex min-w-0 flex-1 flex-col gap-2">
                        <Skeleton className="h-4 w-36" />
                        <Skeleton className="h-3 w-48" />
                        <Skeleton className="h-1 w-full" />
                      </div>
                      <Skeleton className="h-4 w-12" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 basis-0 flex-col overflow-hidden rounded-xl border border-border bg-card">
          <div className="shrink-0 border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-foreground">Daily usage</p>
          </div>
          <DataTableSkeleton rows={4} columns={4} className="min-h-0 flex-1 rounded-none border-0" />
        </div>
      </div>
    </div>
  );
}
