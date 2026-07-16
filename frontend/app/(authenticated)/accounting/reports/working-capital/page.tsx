import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { WorkingCapitalReport } from "@/features/accounting/reports/working-capital-report";

function WorkingCapitalSkeleton() {
  return (
    <div className="flex flex-1 min-h-0 flex-col space-y-6 p-4">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
      <Skeleton className="h-[160px] w-full rounded-xl" />
    </div>
  );
}

export default function WorkingCapitalPage() {
  return (
    <Suspense fallback={<WorkingCapitalSkeleton />}>
      <WorkingCapitalReport />
    </Suspense>
  );
}
