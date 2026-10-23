import { Skeleton } from "@/components/ui/skeleton";
import { WIKI_PAGE_TABLE_HEADERS, WikiFillTable } from "./wiki-collection-skeletons";

export function SpaceDetailSkeleton() {
  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-4">
      <div className="flex min-w-0 items-start gap-4 rounded-xl border border-border bg-card p-4">
        <Skeleton className="h-10 w-10 shrink-0 rounded-md" />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Skeleton className="h-5 w-40 max-w-full" />
            <Skeleton className="h-5 w-16 rounded-md" />
          </div>
          <Skeleton className="h-4 w-full max-w-md" />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Skeleton className="h-3 w-24 shrink-0" />
            <Skeleton className="h-7 w-full rounded-md sm:w-44" />
          </div>
        </div>
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 gap-4">
        <div className="hidden w-56 shrink-0 flex-col gap-2 overflow-hidden rounded-xl border border-border bg-card/50 p-3 md:flex">
          <Skeleton className="h-4 w-24 shrink-0" />
          <div className="grid min-h-0 flex-1 auto-rows-[minmax(2rem,1fr)] gap-2 overflow-hidden">
            {Array.from({ length: 20 }, (_, index) => (
              <Skeleton key={index} className="h-full min-h-0 w-full rounded-md" />
            ))}
          </div>
        </div>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
          <Skeleton className="h-9 w-full shrink-0 rounded-md md:hidden" />
          <div className="flex w-full min-w-0 shrink-0 items-center gap-2">
            <Skeleton className="h-9 min-w-0 flex-1 rounded-md sm:w-64 sm:flex-none" />
            <Skeleton className="h-9 w-24 shrink-0 rounded-md" />
            <Skeleton className="h-9 w-16 shrink-0 rounded-md" />
          </div>
          <WikiFillTable headers={WIKI_PAGE_TABLE_HEADERS} />
        </div>
      </div>
    </div>
  );
}
