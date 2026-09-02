import { requirePermission } from "@/lib/rbac/require-permission";
import { AutomationPerformancePage } from "@/features/support/reports/automation-performance-page";

export default async function Page() {
  await requirePermission("support:reports:view");
  return <AutomationPerformancePage />;
}
