import { requirePermission } from "@/lib/rbac/require-permission";
import { PayslipsContent } from "@/features/payroll/payslips/payslips-content";

export const metadata = { title: "Payslips — Payroll" };

export default async function PayslipsPage() {
  await requirePermission("payroll:payslips:view");
  return <PayslipsContent />;
}
