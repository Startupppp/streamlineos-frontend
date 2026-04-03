import { Skeleton } from "@/components/ui/skeleton";

export default function CalendarLoading() {
  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      {/* Toolbar skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-5 w-36 rounded" />
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-9 w-16 rounded-md" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-28 rounded-md" />
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>
      </div>

      {/* Calendar grid skeleton */}
      <Skeleton className="flex-1 rounded-lg" style={{ height: "calc(100vh - 220px)", minHeight: "500px" }} />
    </div>
  );
}
