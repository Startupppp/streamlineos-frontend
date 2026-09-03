import { Skeleton } from "@/components/ui/skeleton";

export function MailReadingPaneSkeleton() {
  return (
    <div className="flex flex-col h-full min-h-0 w-full p-4 gap-3">
      <div className="flex items-start justify-between gap-2">
        <Skeleton className="h-5 w-2/3 rounded" />
        <Skeleton className="h-8 w-28 rounded" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-24 rounded" />
        <Skeleton className="h-4 w-32 rounded" />
      </div>
      <div className="flex flex-col gap-2 mt-2">
        <Skeleton className="h-4 w-full rounded" />
        <Skeleton className="h-4 w-5/6 rounded" />
        <Skeleton className="h-4 w-4/5 rounded" />
        <Skeleton className="h-4 w-full rounded" />
        <Skeleton className="h-4 w-3/4 rounded" />
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
