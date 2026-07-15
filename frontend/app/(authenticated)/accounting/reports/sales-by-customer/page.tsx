import { Suspense } from "react";
import { LoadingState } from "@/components/shared";
import { SalesByCustomerReport } from "@/features/accounting/reports/sales-by-customer-report";

export default function SalesByCustomerPage() {
  return (
    <Suspense fallback={<LoadingState variant="table" rows={12} />}>
      <SalesByCustomerReport />
    </Suspense>
  );
}
