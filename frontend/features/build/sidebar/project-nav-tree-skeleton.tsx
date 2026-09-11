import { Skeleton } from "@/components/ui/skeleton";

interface ProjectNavTreeSkeletonProps {
  collapsed?: boolean;
}

export function ProjectNavTreeSkeleton({
  collapsed = false,
}: ProjectNavTreeSkeletonProps) {
  if (collapsed) {
    return (
      <div className="mt-1 flex flex-col items-center gap-1 border-t border-sidebar-border/60 pt-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-8 rounded-sm" />
        ))}
      </div>
    );
  }

  return (
    <div className="mb-1 mt-0.5 pl-2.5">
      <div className="min-w-0 space-y-1.5 border-l border-sidebar-border/70 pl-1.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2.5 py-1.5 pl-[1.375rem]">
            <Skeleton className="h-3.5 w-3.5 shrink-0 rounded" />
            <Skeleton className="h-3 min-w-0 flex-1 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
