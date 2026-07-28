import { requirePermission } from "@/lib/rbac/require-permission";
import { ApprovalsView } from "@/features/timesheets/approvals";

export default async function TimesheetApprovalsPage() {
  await requirePermission("timesheets:approvals:view");
  return <ApprovalsView />;
}
