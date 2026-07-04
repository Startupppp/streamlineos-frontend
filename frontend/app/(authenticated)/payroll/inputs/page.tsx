import { requirePermission } from "@/lib/rbac/require-permission";
import { InputsPageContent } from "./inputs-page-content";

export const metadata = { title: "Attendance Inputs — Payroll" };

export default async function PayrollInputsPage() {
  await requirePermission("payroll:runs:view");
  return <InputsPageContent />;
}
