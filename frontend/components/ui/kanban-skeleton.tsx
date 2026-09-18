import { Skeleton } from "./skeleton";

const CARD_WIDTHS = [
  "w-full",
  "w-11/12",
  "w-4/5",
  "w-full",
  "w-3/4",
  "w-11/12",
  "w-full",
  "w-4/5",
  "w-5/6",
  "w-full",
] as const;

export function KanbanColumnSkeleton() {
  return (
    <div className="flex min-h-0 w-72 min-w-[280px] shrink-0 flex-col self-stretch rounded-xl border border-border bg-muted/30">
      <div className="flex shrink-0 items-center justify-between gap-1 border-b border-border/60 px-3 py-2">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <Skeleton className="h-2.5 w-2.5 shrink-0 rounded-full" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-4 w-8 rounded-md" />
      </div>

      <div className="flex-1 min-h-0 space-y-2 overflow-y-auto p-2">
        {CARD_WIDTHS.map((width, index) => (
          <div
            key={width + String(index)}
            className="rounded-xl border border-border/70 bg-card px-3 py-2.5 shadow-sm"
          >
            <Skeleton className={`h-4 ${width}`} />
            <div className="mt-2 flex items-center gap-1.5">
              <Skeleton className="h-3 w-14" />
              <Skeleton className="h-3.5 w-12 rounded-md" />
              <Skeleton className="h-3.5 w-10 rounded-md" />
            </div>
            <div className="mt-2.5 flex items-center justify-between border-t border-border/60 pt-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-5 w-5 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function KanbanBoardSkeleton() {
  return (
    <div className="flex h-full min-h-0 gap-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <KanbanColumnSkeleton key={`skeleton-col-${index}`} />
      ))}
    </div>
  );
}
