import { requirePermission } from "@/lib/rbac/require-permission";
import { ChannelPerformancePage } from "@/features/support/reports/channel-performance-page";

export default async function Page() {
  await requirePermission("support:reports:view");
  return <ChannelPerformancePage />;
}
