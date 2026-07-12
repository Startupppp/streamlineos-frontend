import { Suspense } from "react";
import { LoadingState } from "@/components/shared";
import { VendorStatementReport } from "@/features/accounting/reports/vendor-statement-report";

export default function VendorStatementPage() {
  return (
    <Suspense fallback={<LoadingState variant="table" rows={8} />}>
      <VendorStatementReport />
    </Suspense>
  );
}
