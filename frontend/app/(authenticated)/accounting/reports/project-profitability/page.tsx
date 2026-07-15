import { Suspense } from "react";
import { LoadingState } from "@/components/shared";
import { ProjectProfitabilityReport } from "@/features/accounting/reports/project-profitability-report";

export default function ProjectProfitabilityPage() {
  return (
    <Suspense fallback={<LoadingState variant="table" rows={12} />}>
      <ProjectProfitabilityReport />
    </Suspense>
  );
}
