import { Skeleton } from "@/components/ui/skeleton";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";

export function OnboardingDetailSkeleton() {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="flex justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-28" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
      </div>
      <StatCardGridSkeleton cols={4} count={4} />
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export function ProbationSkeleton() {
  return (
    <div className="space-y-2 pt-2">
      {Array.from({ length: 4 }, (_, index) => (
        <Skeleton key={index} className="h-18 rounded-xl" />
      ))}
    </div>
  );
}
