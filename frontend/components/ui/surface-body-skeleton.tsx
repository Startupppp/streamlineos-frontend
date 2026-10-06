import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function SurfaceBodySkeleton({
  className,
  rows = 3,
}: {
  className?: string;
  rows?: number;
}) {
  return (
    <div
      data-slot="surface-body-skeleton"
      className={cn("flex flex-col gap-4", className)}
      aria-hidden="true"
    >
      <div className="space-y-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-64 max-w-full" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton
            key={i}
            className={cn("h-9 w-full rounded-md", i === rows - 1 && "w-3/4")}
          />
        ))}
      </div>
      <div className="mt-2 flex justify-end gap-2 border-t border-border/60 pt-4">
        <Skeleton className="h-9 w-20 rounded-md" />
        <Skeleton className="h-9 w-24 rounded-md" />
      </div>
    </div>
  );
}
