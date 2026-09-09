import { Suspense } from "react";
import { RequireModule } from "@/components/auth/require-module";
import { ReportBuilderPage } from "@/features/crm/reports/builder/report-builder-page";
import { ReportBuilderFormSkeleton } from "@/features/crm/reports/builder/report-builder-states";

export default function CrmReportBuilderRoute() {
  return (
    <RequireModule module="crm">
      <Suspense fallback={<ReportBuilderFormSkeleton />}>
        <ReportBuilderPage />
      </Suspense>
    </RequireModule>
  );
}
