import { Suspense } from "react";
import { BankImportClient } from "@/features/accounting/banking/components/bank-import-client";
import { Skeleton } from "@/components/ui/skeleton";

function ImportFallback() {
  return (
    <div className="flex flex-col flex-1 min-h-0 px-4 sm:px-6 pt-4 pb-6 space-y-4">
      <div className="flex items-center gap-2">
        <Skeleton className="h-7 w-7 rounded-full" />
        <Skeleton className="h-px w-8 bg-border" />
        <Skeleton className="h-7 w-7 rounded-full" />
        <Skeleton className="h-px w-8 bg-border" />
        <Skeleton className="h-7 w-7 rounded-full" />
        <Skeleton className="h-4 w-16 ml-2" />
      </div>
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <Skeleton className="h-5 w-36" />
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-9 w-full" />
        </div>
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-32 w-full rounded-lg" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-9 rounded-full" />
          <Skeleton className="h-3 w-36" />
        </div>
        <Skeleton className="h-9 w-full" />
      </div>
    </div>
  );
}

export default function BankImportPage() {
  return (
    <Suspense fallback={<ImportFallback />}>
      <BankImportClient />
    </Suspense>
  );
}
