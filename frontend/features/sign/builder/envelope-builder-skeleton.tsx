import { Skeleton } from "@/components/ui/skeleton";

export function EnvelopeBuilderSkeleton() {
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border px-3 py-2 sm:px-4">
        <div className="flex min-w-0 flex-1 basis-full items-center gap-2 sm:basis-auto">
          <Skeleton className="size-9 shrink-0 rounded-md" />
          <Skeleton className="h-4 w-32 max-w-full" />
          <Skeleton className="h-5 w-14 shrink-0 rounded-full" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="h-9 w-20 rounded-md" />
        </div>
      </div>
      <div className="flex shrink-0 gap-1 border-b border-border p-2 lg:hidden">
        <Skeleton className="h-9 min-w-0 flex-1 rounded-md" />
        <Skeleton className="h-9 min-w-0 flex-1 rounded-md" />
        <Skeleton className="h-9 min-w-0 flex-1 rounded-md" />
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:flex-row">
        <div className="hidden min-h-0 w-72 shrink-0 flex-col overflow-hidden border-r border-border lg:flex">
          <div className="space-y-2 p-3">
            <Skeleton className="h-9 w-full rounded-md" />
            <Skeleton className="h-9 w-full rounded-md" />
          </div>
          <div className="flex-1 space-y-2 p-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full rounded-md" />
            ))}
          </div>
        </div>
        <div className="flex min-h-0 min-w-0 flex-1 items-center justify-center bg-muted/30 p-4">
          <Skeleton className="h-full min-h-64 w-full max-w-md flex-1 rounded-lg" />
        </div>
        <div className="hidden w-72 shrink-0 space-y-3 border-l border-border p-4 lg:block">
          <Skeleton className="h-4 w-28" />
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="space-y-1.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-9 w-full rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
