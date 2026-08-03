import { requirePermission } from "@/lib/rbac/require-permission";
import { RunsPageContent } from "@/features/payroll/runs/runs-page-content";

export const metadata = { title: "Payroll Runs" };

export default async function PayrollRunsPage() {
  await requirePermission("payroll:runs:view");
  return <RunsPageContent />;
}
