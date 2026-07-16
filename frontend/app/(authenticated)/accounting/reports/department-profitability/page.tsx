import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { DepartmentProfitabilityReport } from "@/features/accounting/reports/department-profitability-report";

function DepartmentProfitabilitySkeleton() {
  return (
    <div className="flex flex-1 min-h-0 flex-col space-y-2 p-4">
      <Skeleton className="h-9 w-full" />
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="h-8 w-1/4" />
          <Skeleton className="h-8 w-1/5" />
          <Skeleton className="h-8 w-1/5" />
          <Skeleton className="h-8 w-1/5" />
          <Skeleton className="h-8 w-1/5" />
        </div>
      ))}
    </div>
  );
}

export default function DepartmentProfitabilityPage() {
  return (
    <Suspense fallback={<DepartmentProfitabilitySkeleton />}>
      <DepartmentProfitabilityReport />
    </Suspense>
  );
}
