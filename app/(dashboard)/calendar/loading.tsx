import { Skeleton } from "@/components/ui/skeleton";

export default function CalendarLoading() {
  return (
    <div className="flex flex-col h-full gap-0">
      {/* Static header */}
      <div className="px-4 sm:px-6 pt-4 pb-3">
        <h1 className="text-[1.375rem] font-semibold tracking-tight text-foreground leading-tight">Calendar</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Schedule and manage your events.</p>
      </div>
      <div className="mx-4 sm:mx-6 h-px bg-border/60" />

      {/* Toolbar skeleton */}
      <div className="px-4 sm:px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-5 w-36 rounded" />
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-14 rounded-md" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-28 rounded-md" />
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>
      </div>

      {/* Calendar grid skeleton */}
      <div className="flex-1 px-4 sm:px-6 pb-4 min-h-0">
        <Skeleton className="h-full w-full rounded-lg min-h-[400px]" />
      </div>
    </div>
  );
}
