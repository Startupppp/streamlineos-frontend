import { requirePermission } from "@/lib/rbac/require-permission";
import { BillingView } from "@/features/timesheets/billing";
import { GenerateInvoiceLauncher } from "@/features/guided-chain";

export default async function TimesheetBillingPage() {
  await requirePermission("timesheets:billing:view");
  return <BillingView actionsSlot={<GenerateInvoiceLauncher />} />;
}
