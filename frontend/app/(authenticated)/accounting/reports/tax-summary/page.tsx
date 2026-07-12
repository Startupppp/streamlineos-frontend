import { Suspense } from "react";
import { LoadingState } from "@/components/shared";
import { TaxSummaryReport } from "@/features/accounting/reports/tax-summary-report";

export default function TaxSummaryPage() {
  return (
    <Suspense fallback={<LoadingState variant="table" rows={8} />}>
      <TaxSummaryReport />
    </Suspense>
  );
}
