import { RequireModule } from "@/components/auth/require-module";
import { ReportActivityPage } from "@/features/crm/reports/activity/report-activity-page";

export default function CrmReportActivityRoute() {
  return (
    <RequireModule module="crm">
      <ReportActivityPage />
    </RequireModule>
  );
}
