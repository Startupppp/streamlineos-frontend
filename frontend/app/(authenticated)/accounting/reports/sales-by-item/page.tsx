import { Suspense } from "react";
import { LoadingState } from "@/components/shared";
import { SalesByItemReport } from "@/features/accounting/reports/sales-by-item-report";

export default function SalesByItemPage() {
  return (
    <Suspense fallback={<LoadingState variant="table" rows={8} />}>
      <SalesByItemReport />
    </Suspense>
  );
}
