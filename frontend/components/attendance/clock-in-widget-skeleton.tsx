import { Skeleton } from "../ui/skeleton";

export function ClockInWidgetSkeleton() {
  return (
    <div
      className="flex w-full min-w-0 items-center justify-between gap-3 sm:w-auto sm:justify-end"
      aria-hidden="true"
      data-testid="clock-in-widget-skeleton"
    >
      <div className="flex min-w-0 flex-1 items-baseline gap-1.5 sm:flex-none sm:justify-end">
        <Skeleton className="h-4 w-14" />
        <Skeleton className="hidden h-3 w-16 sm:block" />
      </div>
      <Skeleton className="h-9 w-[5.25rem] shrink-0 rounded-md" />
    </div>
  );
}
