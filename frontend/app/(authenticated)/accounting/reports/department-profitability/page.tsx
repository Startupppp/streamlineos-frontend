import { Suspense } from "react";
import { LoadingState } from "@/components/shared";
import { DepartmentProfitabilityReport } from "@/features/accounting/reports/department-profitability-report";

export default function DepartmentProfitabilityPage() {
  return (
    <Suspense fallback={<LoadingState variant="table" rows={8} />}>
      <DepartmentProfitabilityReport />
    </Suspense>
  );
}
