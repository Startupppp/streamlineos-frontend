import { Skeleton } from "@/components/ui/skeleton";

export default function ProjectKanbanLoading() {
  return (
    <div className="h-full flex flex-col">
      {/* Project header with tabs */}
      <div className="border-b px-4 py-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-9 w-24" />
        </div>
        <div className="flex items-center gap-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-20" />
          ))}
        </div>
      </div>

      {/* Filters bar */}
      <div className="border-b px-4 py-2 flex items-center gap-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-8 w-32" />
      </div>

      {/* Kanban columns */}
      <div className="flex-1 overflow-hidden p-4">
        <div className="flex gap-4 h-full">
          {Array.from({ length: 4 }).map((_, col) => (
            <div key={col} className="min-w-[280px] w-[280px] flex flex-col rounded-xl border bg-muted/30">
              {/* Column header */}
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-t-xl">
                <div className="flex items-center gap-2">
                  <Skeleton className="w-2.5 h-2.5 rounded-full" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <Skeleton className="h-5 w-6 rounded-md" />
              </div>
              {/* Cards */}
              <div className="flex-1 p-2.5 space-y-2">
                {Array.from({ length: 3 }).map((_, card) => (
                  <div key={card} className="rounded-lg border bg-card p-3 space-y-2">
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <div className="flex items-center justify-between mt-3">
                      <Skeleton className="h-6 w-6 rounded-full" />
                      <Skeleton className="h-4 w-12" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
