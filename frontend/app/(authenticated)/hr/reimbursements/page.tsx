import { requirePermission } from "@/lib/rbac/require-permission";
import { ReimbursementsPage } from "@/features/hr/reimbursements/reimbursements-page";

export default async function HrReimbursementsPage() {
  await requirePermission("hr:payroll:view");
  return <ReimbursementsPage />;
}
