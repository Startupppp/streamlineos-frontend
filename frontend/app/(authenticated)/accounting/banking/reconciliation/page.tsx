import { Suspense } from "react";
import { ReconciliationClient } from "@/features/accounting/banking/components/reconciliation-client";
import { Skeleton } from "@/components/ui/skeleton";

function ReconciliationFallback() {
  return (
    <div className="flex flex-col flex-1 min-h-0 px-4 sm:px-6 pt-4 pb-6 space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Skeleton className="h-9 w-[220px]" />
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-28" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col border border-border rounded-xl overflow-hidden">
          <div className="flex border-b border-border">
            <Skeleton className="flex-1 h-9 rounded-none" />
            <Skeleton className="flex-1 h-9 rounded-none" />
          </div>
          <div className="space-y-0">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="px-3 py-2.5 border-b border-border/50 space-y-1"
              >
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3.5 w-48" />
              </div>
            ))}
          </div>
        </div>
        <Skeleton className="rounded-xl min-h-[400px]" />
      </div>
    </div>
  );
}

export default function ReconciliationPage() {
  return (
    <Suspense fallback={<ReconciliationFallback />}>
      <ReconciliationClient />
    </Suspense>
  );
}
