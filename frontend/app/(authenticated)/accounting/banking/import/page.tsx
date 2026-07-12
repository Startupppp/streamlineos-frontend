import { Suspense } from "react";
import { BankImportClient } from "@/features/accounting/banking/components/bank-import-client";
import { Skeleton } from "@/components/ui/skeleton";

function ImportFallback() {
  return (
    <div className="flex flex-col flex-1 min-h-0 px-4 sm:px-6 pt-4 pb-6 space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full rounded-xl" />
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
