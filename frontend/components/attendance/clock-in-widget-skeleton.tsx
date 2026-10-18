import { Skeleton } from "../ui/skeleton";

export function ClockInWidgetSkeleton() {
  return (
    <div className="flex items-center gap-6" aria-hidden="true" data-testid="clock-in-widget-skeleton">
      <div className="flex flex-col items-end gap-1">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-3 w-48" />
      </div>
      <Skeleton className="h-8 w-32 rounded-sm" />
    </div>
  );
}
