import { Suspense } from "react";
import { LoadingState } from "@/components/shared";
import { WorkingCapitalReport } from "@/features/accounting/reports/working-capital-report";

export default function WorkingCapitalPage() {
  return (
    <Suspense fallback={<LoadingState variant="cards" rows={3} />}>
      <WorkingCapitalReport />
    </Suspense>
  );
}
