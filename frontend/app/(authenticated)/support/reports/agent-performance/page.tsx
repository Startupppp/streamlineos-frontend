import { requirePermission } from "@/lib/rbac/require-permission";
import { AgentPerformancePage } from "@/features/support/reports/agent-performance-page";

export default async function Page() {
  await requirePermission("support:reports:view");
  return <AgentPerformancePage />;
}
