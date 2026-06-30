import { Skeleton } from "@/components/ui/skeleton";

export function NotificationListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="border border-border rounded-lg divide-y divide-border">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-start gap-2.5 px-3 py-2.5">
          <Skeleton className="h-8 w-8 rounded-lg shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center gap-2">
              <Skeleton className="h-3.5 w-36" />
              <Skeleton className="h-4 w-14 rounded-full" />
            </div>
            <Skeleton className="h-3 w-full max-w-xs" />
          </div>
          <Skeleton className="h-2 w-2 rounded-full shrink-0 mt-1.5" />
        </div>
      ))}
    </div>
  );
}
