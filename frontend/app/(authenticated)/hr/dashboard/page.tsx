import { requirePermission } from "@/lib/rbac/require-permission";
import { HrDashboardPage } from "@/features/hr/dashboard/hr-dashboard-page";

export const metadata = { title: "HR Dashboard" };

export default async function HrDashboardRoute() {
  await requirePermission("hr:analytics:read");
  return <HrDashboardPage />;
}
