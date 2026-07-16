import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { TaxSummaryReport } from "@/features/accounting/reports/tax-summary-report";

function TaxSummarySkeleton() {
  return (
    <div className="flex flex-1 min-h-0 flex-col space-y-4 p-4">
      <Skeleton className="h-[220px] w-full rounded-xl" />
      <Skeleton className="h-9 w-full" />
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex gap-3">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
        </div>
      ))}
    </div>
  );
}

export default function TaxSummaryPage() {
  return (
    <Suspense fallback={<TaxSummarySkeleton />}>
      <TaxSummaryReport />
    </Suspense>
  );
}
