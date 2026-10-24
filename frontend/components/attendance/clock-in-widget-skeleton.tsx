import { Skeleton } from "../ui/skeleton";

export function ClockInWidgetSkeleton() {
  return (
    <div
      className="flex w-full min-w-0 items-center justify-between gap-3 sm:w-auto sm:justify-end"
      aria-hidden="true"
      data-testid="clock-in-widget-skeleton"
    >
      <div className="flex min-w-0 flex-col items-start gap-1 sm:items-end">
        <Skeleton className="h-4 w-24 sm:w-32" />
        <Skeleton className="h-3 w-24 sm:w-44" />
      </div>
      <Skeleton className="h-9 w-[4.75rem] shrink-0 rounded-sm sm:w-[5.5rem]" />
    </div>
  );
}
