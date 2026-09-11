import { Skeleton } from "@/components/ui/skeleton";

export function NotificationDetailSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading notification"
      className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col gap-3 border-l border-border bg-background p-6"
    >
      <Skeleton className="h-5 w-2/3 rounded" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-20 rounded-md" />
        <Skeleton className="h-5 w-16 rounded-md" />
      </div>
      <Skeleton className="h-4 w-full rounded" />
      <Skeleton className="h-4 w-5/6 rounded" />
      <Skeleton className="h-4 w-3/4 rounded" />
      <Skeleton className="mt-auto h-9 w-full rounded" />
    </div>
  );
}
