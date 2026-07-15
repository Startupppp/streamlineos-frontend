import { Suspense } from "react";
import { LoadingState } from "@/components/shared";
import { ExpenseByCategoryReport } from "@/features/accounting/reports/expense-by-category-report";

export default function ExpenseByCategoryPage() {
  return (
    <Suspense fallback={<LoadingState variant="table" rows={12} />}>
      <ExpenseByCategoryReport />
    </Suspense>
  );
}
