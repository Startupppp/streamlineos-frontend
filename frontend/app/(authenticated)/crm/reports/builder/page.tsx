import { RequireModule } from "@/components/auth/require-module";
import { ReportBuilderPage } from "@/features/crm/reports/builder/report-builder-page";

export default function CrmReportBuilderRoute() {
  return (
    <RequireModule module="crm">
      <ReportBuilderPage />
    </RequireModule>
  );
}
