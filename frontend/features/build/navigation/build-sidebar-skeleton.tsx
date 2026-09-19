import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface BuildSidebarSkeletonProps {
  isCollapsed?: boolean;
}

export function BuildSidebarSkeleton({
  isCollapsed = false,
}: BuildSidebarSkeletonProps) {
  return (
    <div
      className={cn("space-y-1.5", isCollapsed ? "px-1 py-2" : "px-2.5 py-2")}
    >
      <Skeleton
        className={cn("h-10 rounded-md", isCollapsed ? "mx-auto w-8" : "w-full")}
      />
      <div className="space-y-px pt-2">
        {Array.from({ length: 7 }).map((_, index) =>
          isCollapsed ? (
            <Skeleton key={index} className="mx-auto h-8 w-8 rounded-sm" />
          ) : (
            <div key={index} className="flex items-center gap-2.5 px-2.5 py-1.5">
              <Skeleton className="h-4 w-4 shrink-0 rounded" />
              <Skeleton className="h-3.5 max-w-[7rem] flex-1 rounded" />
            </div>
          ),
        )}
      </div>
    </div>
  );
}
