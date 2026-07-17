import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface DataTableSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export function DataTableSkeleton({ rows = 8, columns = 5, className }: DataTableSkeletonProps) {
  return (
    <div className={cn("rounded-lg border border-border overflow-hidden", className)}>
      <div className="flex items-center gap-4 border-b border-border bg-muted/40 px-4 py-2.5">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-3.5 flex-1" />
        ))}
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-4 px-4 py-3">
            {Array.from({ length: columns }).map((_, c) => (
              <Skeleton key={c} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
