import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { VendorStatementReport } from "@/features/accounting/reports/vendor-statement-report";

function VendorStatementSkeleton() {
  return (
    <div className="flex flex-1 min-h-0 flex-col space-y-2 p-4">
      <Skeleton className="h-9 w-full" />
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="h-8 w-1/6" />
          <Skeleton className="h-8 w-1/6" />
          <Skeleton className="h-8 w-1/6" />
          <Skeleton className="h-8 w-1/6" />
          <Skeleton className="h-8 w-1/6" />
          <Skeleton className="h-8 w-1/6" />
        </div>
      ))}
    </div>
  );
}

export default function VendorStatementPage() {
  return (
    <Suspense fallback={<VendorStatementSkeleton />}>
      <VendorStatementReport />
    </Suspense>
  );
}
