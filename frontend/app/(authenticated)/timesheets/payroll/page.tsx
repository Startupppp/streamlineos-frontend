import { requirePermission } from "@/lib/rbac/require-permission";
import { TimesheetPayrollPageClient } from "@/features/timesheets/payroll/payroll-page-client";

export default async function TimesheetPayrollPage() {
  await requirePermission("timesheets:payroll:view");
  return <TimesheetPayrollPageClient />;
}
