import { requirePermission } from "@/lib/rbac/require-permission";
import { ReportsView } from "@/features/timesheets/reports";

export default async function TimesheetReportsPage() {
  await requirePermission("timesheets:reports:view");
  return <ReportsView />;
}
