import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface BuildSidebarSkeletonProps {
  isCollapsed?: boolean;
}

function NavRowSkeleton({ isCollapsed }: { isCollapsed: boolean }) {
  return isCollapsed ? (
    <Skeleton className="mx-auto h-8 w-8 rounded-sm" />
  ) : (
    <div className="flex items-center gap-2.5 px-2.5 py-1.5">
      <Skeleton className="h-4 w-4 shrink-0 rounded" />
      <Skeleton className="h-3.5 max-w-[7rem] flex-1 rounded" />
    </div>
  );
}

export function BuildSidebarSkeleton({
  isCollapsed = false,
}: BuildSidebarSkeletonProps) {
  return (
    <div className={cn("flex flex-col", isCollapsed ? "px-1 py-2" : "px-2.5 py-2")}>
      <Skeleton
        className={cn("h-10 rounded-md", isCollapsed ? "mx-auto w-8" : "w-full")}
      />

      {isCollapsed ? (
        <div aria-hidden className="mx-auto my-1.5 h-px w-5 bg-sidebar-border" />
      ) : (
        <Skeleton className="ml-2 mt-3 mb-1 h-2.5 w-16 rounded" />
      )}
      <div className="space-y-px">
        {Array.from({ length: 5 }).map((_, index) => (
          <NavRowSkeleton key={index} isCollapsed={isCollapsed} />
        ))}
      </div>

      <div className={cn("pt-2", isCollapsed ? "space-y-1" : "space-y-0.5")}>
        {Array.from({ length: 3 }).map((_, index) => (
          <NavRowSkeleton key={index} isCollapsed={isCollapsed} />
        ))}
      </div>
    </div>
  );
}
