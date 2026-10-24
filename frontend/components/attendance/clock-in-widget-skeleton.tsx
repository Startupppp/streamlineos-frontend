import { Skeleton } from "../ui/skeleton";

export function ClockInWidgetSkeleton() {
  return (
    <div
      className="flex w-full min-w-0 items-center justify-end gap-2.5 sm:w-auto"
      aria-hidden="true"
      data-testid="clock-in-widget-skeleton"
    >
      <div className="flex min-w-0 items-baseline justify-end gap-1.5">
        <Skeleton className="h-4 w-14" />
        <Skeleton className="hidden h-3 w-16 sm:block" />
      </div>
      <Skeleton className="h-8 w-[4.5rem] shrink-0 rounded-md sm:h-9 sm:w-[5.25rem]" />
    </div>
  );
}
