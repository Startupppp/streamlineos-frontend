import { requirePermission } from "@/lib/rbac/require-permission";
import { QueuePerformancePage } from "@/features/support/reports/queue-performance-page";

export default async function Page() {
  await requirePermission("support:reports:view");
  return <QueuePerformancePage />;
}
