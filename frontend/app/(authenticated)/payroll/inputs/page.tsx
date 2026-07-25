import { requirePermission } from "@/lib/rbac/require-permission";
import { InputsPageContent } from "@/features/payroll/inputs/inputs-page-content";

export const metadata = { title: "Payroll Inputs" };

export default async function PayrollInputsPage() {
  await requirePermission("hr:payroll:view");
  return <InputsPageContent />;
}
