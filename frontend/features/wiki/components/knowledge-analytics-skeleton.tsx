import { Skeleton } from "@/components/ui/skeleton";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";

export function AnalyticsSkeleton() {
  return (
    <div className="space-y-4">
      <StatCardGridSkeleton cols={6} count={6} />
      {Array.from({ length: 3 }, (_, section) => (
        <div key={section} className="space-y-2">
          <Skeleton className="h-4 w-36" />
          {Array.from({ length: 5 }, (_, row) => (
            <Skeleton key={row} className="h-9 w-full rounded-md" />
          ))}
        </div>
      ))}
    </div>
  );
}
