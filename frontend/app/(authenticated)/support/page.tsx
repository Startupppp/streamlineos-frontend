import { requirePermission } from "@/lib/rbac/require-permission";
import { SupportDashboardPage } from "@/features/support/support-dashboard-page";

export default async function Page() {
  await requirePermission("dashboard:support:view");
  return <SupportDashboardPage />;
}
