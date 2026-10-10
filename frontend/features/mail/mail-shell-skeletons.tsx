import { Skeleton } from "@/components/ui/skeleton";

const SKELETON_ROWS = Array.from({ length: 8 }, (_, index) => index);

export function MailHeaderSkeleton() {
  return (
    <div className="flex min-h-14 shrink-0 items-center gap-2 border-b border-border bg-background px-3 py-2 sm:px-4">
      <Skeleton className="size-8 shrink-0 rounded-lg" />
      <Skeleton className="h-5 w-16 rounded" />
      <div className="ml-auto flex items-center gap-1">
        <Skeleton className="hidden h-9 w-24 rounded-md sm:block" />
        <Skeleton className="size-9 rounded-md" />
        <Skeleton className="hidden h-9 w-24 rounded-md md:block" />
      </div>
    </div>
  );
}

export function MailListPaneSkeleton() {
  return (
    <div className="flex h-full min-h-0 flex-col bg-card">
      <div className="shrink-0 border-b border-border/40">
        <div className="flex flex-row flex-nowrap items-center gap-2 px-2 py-1.5">
          <Skeleton className="h-9 min-w-0 flex-1 rounded-md" />
          <Skeleton className="h-9 w-36 min-w-28 shrink-0 rounded-md sm:w-40" />
        </div>
        <div className="flex gap-1 overflow-hidden px-2 pb-1.5">
          {[...Array(5)].map((_, index) => (
            <Skeleton key={index} className="h-6 w-16 shrink-0 rounded-full" />
          ))}
        </div>
      </div>
      <MailListRowsSkeleton />
    </div>
  );
}

export function MailListRowsSkeleton() {
  return (
    <div className="min-h-0 flex-1 overflow-hidden bg-card">
        <div className="flex h-8 items-center gap-2 border-b border-border/20 bg-muted/30 px-3">
          <Skeleton className="h-3 w-24 rounded" />
          <Skeleton className="ml-auto h-3 w-6 rounded" />
        </div>
        {SKELETON_ROWS.map((index) => (
          <div
            key={index}
            className="grid min-h-14 grid-cols-[minmax(0,1fr)_auto] gap-2 border-b border-border/20 px-3 py-2.5"
          >
            <div className="min-w-0">
              <div className="mb-1 flex items-center gap-2">
                <Skeleton className="size-1.5 shrink-0 rounded-full" />
                <Skeleton className="h-3.5 w-32 max-w-[55%] rounded" />
              </div>
              <Skeleton className="ml-3.5 h-3.5 w-4/5 rounded" />
            </div>
            <div className="flex flex-col items-end gap-2">
              <Skeleton className="h-3 w-12 rounded" />
              <Skeleton className="size-3.5 rounded-full" />
            </div>
          </div>
        ))}
    </div>
  );
}

export function MailContentSkeleton() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1">
      <div className="flex min-w-0 flex-1 lg:w-96 lg:flex-none xl:w-1/3">
        <MailListPaneSkeleton />
      </div>
      <div className="hidden min-w-0 flex-1 lg:flex">
        <MailReadingPaneSkeleton />
      </div>
    </div>
  );
}

export function MailReadingPaneSkeleton() {
  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-muted/15">
      <div className="shrink-0 border-b border-border bg-background px-3 py-2.5 sm:px-4 sm:py-3">
        <div className="flex items-start gap-2 sm:gap-3">
          <Skeleton className="mt-1 size-8 shrink-0 rounded-md" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-5 w-2/3 rounded" />
            <Skeleton className="h-3.5 w-1/2 rounded" />
          </div>
          <div className="flex shrink-0 gap-1">
            <Skeleton className="size-9 rounded-md" />
            <Skeleton className="size-9 rounded-md" />
            <Skeleton className="size-9 rounded-md" />
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-start gap-3 border-b border-border/40 px-4 py-3">
        <Skeleton className="size-8 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-36 rounded" />
          <Skeleton className="h-3 w-52 max-w-full rounded" />
        </div>
        <Skeleton className="h-3 w-16 rounded" />
      </div>
      <div className="min-h-0 flex-1 overflow-hidden bg-background p-4 sm:p-5">
        <div className="mx-auto w-full max-w-3xl space-y-3 rounded-xl border border-border/50 p-4 sm:p-6">
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-4 w-11/12 rounded" />
          <Skeleton className="h-4 w-4/5 rounded" />
          <Skeleton className="mt-5 h-32 w-full rounded-lg" />
          <Skeleton className="h-4 w-2/3 rounded" />
        </div>
      </div>
    </div>
  );
}

export function MailSheetSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="fixed inset-y-0 right-0 z-50 flex w-full flex-col gap-3 border-l border-border bg-background p-6 sm:max-w-lg"
    >
      <Skeleton className="h-5 w-40 rounded" />
      <Skeleton className="h-4 w-64 rounded" />
      <Skeleton className="h-10 w-full rounded" />
      <Skeleton className="h-10 w-full rounded" />
      <Skeleton className="h-40 w-full rounded" />
    </div>
  );
}
