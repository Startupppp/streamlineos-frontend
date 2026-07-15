import { Suspense } from "react";
import { LoadingState } from "@/components/shared";
import { CustomerStatementReport } from "@/features/accounting/reports/customer-statement-report";

export default function CustomerStatementPage() {
  return (
    <Suspense fallback={<LoadingState variant="table" rows={12} />}>
      <CustomerStatementReport />
    </Suspense>
  );
}
