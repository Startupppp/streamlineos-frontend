import { requirePermission } from "@/lib/rbac/require-permission";
import { BillingView } from "@/features/timesheets/billing";

export default async function TimesheetBillingPage() {
  await requirePermission("timesheets:billing:view");
  return <BillingView />;
}
