import { Suspense } from "react";
import { ReconciliationClient } from "@/features/accounting/banking/components/reconciliation-client";
import { Skeleton } from "@/components/ui/skeleton";

function ReconciliationFallback() {
  return (
    <div className="flex flex-col flex-1 min-h-0 px-4 sm:px-6 pt-4 pb-6 space-y-4">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-96 w-full rounded-xl" />
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
