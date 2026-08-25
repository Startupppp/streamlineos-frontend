import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { RunsPageContent } from "@/features/payroll/runs/runs-page-content";
import { prefetchPayrollRuns } from "@/lib/prefetch/payroll";

export const metadata = { title: "Payroll Runs" };

export default async function PayrollRunsPage() {
  await requirePermission("payroll:runs:view");
  const state = await prefetchPayrollRuns();
  return (
    <HydrationBoundary state={state}>
      <RunsPageContent />
    </HydrationBoundary>
  );
}
